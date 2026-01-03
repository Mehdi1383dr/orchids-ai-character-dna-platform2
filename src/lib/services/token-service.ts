import { createServiceClient } from "@/lib/supabase/server";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface TokenBalance {
  userId: string;
  balance: number;
  subscriptionTokens: number;
  purchasedTokens: number;
  freeDailyTokens: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: string;
}

interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  action: string;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export class TokenService {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async getBalance(userId: string): Promise<ServiceResult<TokenBalance>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("token_balances")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        const createResult = await this.createBalance(userId);
        if (createResult.success) {
          return createResult;
        }
      }
      return { success: false, error: "Balance not found", code: "NOT_FOUND" };
    }

    return { success: true, data: this.mapToBalance(data) };
  }

  async createBalance(userId: string, initialBalance: number = 0): Promise<ServiceResult<TokenBalance>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("token_balances")
      .insert({
        user_id: userId,
        balance: initialBalance,
        subscription_tokens: 0,
        purchased_tokens: 0,
        free_daily_tokens: 10,
        lifetime_earned: initialBalance,
        lifetime_spent: 0,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToBalance(data) };
  }

  async useTokens(
    userId: string,
    amount: number,
    action: string,
    options?: {
      description?: string;
      referenceType?: string;
      referenceId?: string;
    }
  ): Promise<ServiceResult<{ newBalance: number; tokensUsed: number }>> {
    const client = await this.getClient();

    const balanceResult = await this.getBalance(userId);
    if (!balanceResult.success || !balanceResult.data) {
      return { success: false, error: "Balance not found", code: "NOT_FOUND" };
    }

    const balance = balanceResult.data;

    if (balance.balance < amount) {
      return {
        success: false,
        error: `Insufficient tokens. Required: ${amount}, Available: ${balance.balance}`,
        code: "INSUFFICIENT_TOKENS",
      };
    }

    const newBalance = balance.balance - amount;

    const { error: updateError } = await client
      .from("token_balances")
      .update({
        balance: newBalance,
        lifetime_spent: balance.lifetimeSpent + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return { success: false, error: updateError.message, code: "DB_ERROR" };
    }

    await client.from("token_ledger").insert({
      user_id: userId,
      amount: -amount,
      balance_after: newBalance,
      action,
      description: options?.description || null,
      reference_type: options?.referenceType || null,
      reference_id: options?.referenceId || null,
    });

    return {
      success: true,
      data: { newBalance, tokensUsed: amount },
    };
  }

  async addTokens(
    userId: string,
    amount: number,
    action: string,
    options?: {
      description?: string;
      referenceType?: string;
      referenceId?: string;
      tokenType?: "subscription" | "purchased" | "free";
    }
  ): Promise<ServiceResult<{ newBalance: number; tokensAdded: number }>> {
    const client = await this.getClient();

    const balanceResult = await this.getBalance(userId);
    if (!balanceResult.success || !balanceResult.data) {
      const createResult = await this.createBalance(userId, amount);
      if (!createResult.success) {
        return { success: false, error: "Failed to create balance", code: "DB_ERROR" };
      }
      return {
        success: true,
        data: { newBalance: amount, tokensAdded: amount },
      };
    }

    const balance = balanceResult.data;
    const newBalance = balance.balance + amount;

    const updateData: Record<string, unknown> = {
      balance: newBalance,
      lifetime_earned: balance.lifetimeEarned + amount,
      updated_at: new Date().toISOString(),
    };

    if (options?.tokenType === "subscription") {
      updateData.subscription_tokens = balance.subscriptionTokens + amount;
    } else if (options?.tokenType === "purchased") {
      updateData.purchased_tokens = balance.purchasedTokens + amount;
    }

    const { error: updateError } = await client
      .from("token_balances")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      return { success: false, error: updateError.message, code: "DB_ERROR" };
    }

    await client.from("token_ledger").insert({
      user_id: userId,
      amount,
      balance_after: newBalance,
      action,
      description: options?.description || null,
      reference_type: options?.referenceType || null,
      reference_id: options?.referenceId || null,
    });

    return {
      success: true,
      data: { newBalance, tokensAdded: amount },
    };
  }

  async getTransactions(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
    }
  ): Promise<ServiceResult<{ transactions: TokenTransaction[]; total: number }>> {
    const client = await this.getClient();

    let query = client
      .from("token_ledger")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.action) {
      query = query.eq("action", options.action);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return {
      success: true,
      data: {
        transactions: (data || []).map(this.mapToTransaction),
        total: count || 0,
      },
    };
  }

  async checkSufficientTokens(userId: string, requiredAmount: number): Promise<boolean> {
    const balanceResult = await this.getBalance(userId);
    if (!balanceResult.success || !balanceResult.data) {
      return false;
    }
    return balanceResult.data.balance >= requiredAmount;
  }

  async refundTokens(
    userId: string,
    amount: number,
    reason: string,
    originalTransactionId?: string
  ): Promise<ServiceResult<{ newBalance: number }>> {
    return this.addTokens(userId, amount, "refund", {
      description: reason,
      referenceType: originalTransactionId ? "transaction" : undefined,
      referenceId: originalTransactionId,
    });
  }

  async grantSubscriptionTokens(
    userId: string,
    plan: string,
    monthlyTokens: number
  ): Promise<ServiceResult<{ newBalance: number }>> {
    const client = await this.getClient();

    await client
      .from("token_balances")
      .update({ subscription_tokens: 0 })
      .eq("user_id", userId);

    return this.addTokens(userId, monthlyTokens, "subscription_grant", {
      description: `Monthly ${plan} plan tokens`,
      tokenType: "subscription",
    });
  }

  private mapToBalance(row: Record<string, unknown>): TokenBalance {
    return {
      userId: row.user_id as string,
      balance: row.balance as number,
      subscriptionTokens: row.subscription_tokens as number,
      purchasedTokens: row.purchased_tokens as number,
      freeDailyTokens: row.free_daily_tokens as number,
      lifetimeEarned: row.lifetime_earned as number,
      lifetimeSpent: row.lifetime_spent as number,
      updatedAt: row.updated_at as string,
    };
  }

  private mapToTransaction(row: Record<string, unknown>): TokenTransaction {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      amount: row.amount as number,
      balanceAfter: row.balance_after as number,
      action: row.action as string,
      description: row.description as string | null,
      referenceType: row.reference_type as string | null,
      referenceId: row.reference_id as string | null,
      createdAt: row.created_at as string,
    };
  }
}

export const tokenService = new TokenService();
