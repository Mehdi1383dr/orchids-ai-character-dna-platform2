import { createServiceClient } from "@/lib/supabase/server";
import {
  type LedgerSourceType,
  type LedgerActionType,
  type LedgerEntry,
  type LedgerBalance,
  type TokenPool,
  ACTION_COSTS,
  POOL_PRIORITY,
  FREE_DAILY_AMOUNT,
  SUBSCRIPTION_TOKENS,
  PRO_ROLLOVER_CAP,
} from "@/lib/types/ledger";
import crypto from "crypto";

function generateIdempotencyKey(userId: string, action: string, referenceId?: string): string {
  const data = `${userId}:${action}:${referenceId || Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}

export async function getBalance(userId: string): Promise<LedgerBalance> {
  const supabase = await createServiceClient();

  const { data: lastEntry } = await supabase
    .from("token_ledger")
    .select("balance_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const currentBalance = lastEntry?.balance_after ?? 0;

  const { data: pools } = await supabase
    .from("token_pools")
    .select("source_type, remaining, expires_at")
    .eq("user_id", userId)
    .gt("remaining", 0);

  const now = new Date();
  let freeTokens = 0;
  let subscriptionTokens = 0;
  let purchasedTokens = 0;
  let adminTokens = 0;

  for (const pool of pools || []) {
    const isExpired = pool.expires_at && new Date(pool.expires_at) <= now;
    if (isExpired && pool.source_type !== "purchase") continue;

    switch (pool.source_type) {
      case "free":
        freeTokens += pool.remaining;
        break;
      case "subscription":
        subscriptionTokens += pool.remaining;
        break;
      case "purchase":
        purchasedTokens += pool.remaining;
        break;
      case "admin":
        adminTokens += pool.remaining;
        break;
    }
  }

  return {
    userId,
    currentBalance,
    freeTokens,
    subscriptionTokens,
    purchasedTokens,
    adminTokens,
  };
}

export async function checkBalance(
  userId: string,
  action: LedgerActionType
): Promise<{ canAfford: boolean; balance: number; cost: number; shortfall: number }> {
  const balance = await getBalance(userId);
  const cost = ACTION_COSTS[action] || 0;
  const canAfford = balance.currentBalance >= cost;

  return {
    canAfford,
    balance: balance.currentBalance,
    cost,
    shortfall: canAfford ? 0 : cost - balance.currentBalance,
  };
}

interface DeductResult {
  success: boolean;
  entry?: LedgerEntry;
  newBalance?: number;
  error?: string;
  idempotent?: boolean;
}

export async function deductTokens(
  userId: string,
  action: LedgerActionType,
  options?: {
    referenceId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<DeductResult> {
  const supabase = await createServiceClient();
  const cost = ACTION_COSTS[action];

  if (!cost) {
    return { success: false, error: `Unknown action: ${action}` };
  }

  const idempotencyKey = options?.idempotencyKey || generateIdempotencyKey(userId, action, options?.referenceId);

  const { data: existingEntry } = await supabase
    .from("token_ledger")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (existingEntry) {
    return {
      success: true,
      entry: mapLedgerEntry(existingEntry),
      newBalance: existingEntry.balance_after,
      idempotent: true,
    };
  }

  const { data: lastEntry } = await supabase
    .from("token_ledger")
    .select("balance_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const currentBalance = lastEntry?.balance_after ?? 0;

  if (currentBalance < cost) {
    return {
      success: false,
      error: `Insufficient balance. Need ${cost}, have ${currentBalance}`,
      newBalance: currentBalance,
    };
  }

  const now = new Date();
  const { data: pools } = await supabase
    .from("token_pools")
    .select("*")
    .eq("user_id", userId)
    .gt("remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
    .order("expires_at", { ascending: true, nullsFirst: false });

  const sortedPools = (pools || []).sort((a, b) => {
    const aIdx = POOL_PRIORITY.indexOf(a.source_type as LedgerSourceType);
    const bIdx = POOL_PRIORITY.indexOf(b.source_type as LedgerSourceType);
    if (aIdx !== bIdx) return aIdx - bIdx;
    if (a.expires_at && b.expires_at) {
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    }
    return a.expires_at ? -1 : 1;
  });

  let remaining = cost;
  const poolDeductions: { poolId: string; amount: number }[] = [];
  let primarySourceType: LedgerSourceType = "free";

  for (const pool of sortedPools) {
    if (remaining <= 0) break;
    const deduct = Math.min(remaining, pool.remaining);
    poolDeductions.push({ poolId: pool.id, amount: deduct });
    remaining -= deduct;
    if (poolDeductions.length === 1) {
      primarySourceType = pool.source_type as LedgerSourceType;
    }
  }

  if (remaining > 0) {
    return {
      success: false,
      error: `Insufficient tokens in pools. Short by ${remaining}`,
      newBalance: currentBalance,
    };
  }

  for (const { poolId, amount } of poolDeductions) {
    const { error: poolError } = await supabase.rpc("decrement_pool_remaining", {
      pool_id: poolId,
      decrement_amount: amount,
    });
    
    if (poolError) {
      const { error: updateError } = await supabase
        .from("token_pools")
        .update({ 
          remaining: supabase.rpc ? undefined : pools?.find(p => p.id === poolId)?.remaining || 0 - amount,
          updated_at: now.toISOString() 
        })
        .eq("id", poolId);

      if (updateError) {
        return { success: false, error: `Failed to update pool: ${updateError.message}` };
      }
    }
  }

  const newBalance = currentBalance - cost;

  const { data: entry, error: ledgerError } = await supabase
    .from("token_ledger")
    .insert({
      user_id: userId,
      amount: -cost,
      balance_after: newBalance,
      source_type: primarySourceType,
      action_type: action,
      pool_id: poolDeductions[0]?.poolId,
      reference_id: options?.referenceId,
      idempotency_key: idempotencyKey,
      metadata: {
        ...options?.metadata,
        pool_deductions: poolDeductions,
      },
    })
    .select()
    .single();

  if (ledgerError) {
    return { success: false, error: `Failed to create ledger entry: ${ledgerError.message}` };
  }

  return {
    success: true,
    entry: mapLedgerEntry(entry),
    newBalance,
  };
}

interface CreditResult {
  success: boolean;
  pool?: TokenPool;
  entry?: LedgerEntry;
  newBalance?: number;
  error?: string;
}

export async function creditTokens(
  userId: string,
  amount: number,
  sourceType: LedgerSourceType,
  options?: {
    expiresAt?: Date;
    rolloverEligible?: boolean;
    referenceId?: string;
    idempotencyKey?: string;
    actionType?: LedgerActionType;
    metadata?: Record<string, unknown>;
  }
): Promise<CreditResult> {
  const supabase = await createServiceClient();

  if (amount <= 0) {
    return { success: false, error: "Amount must be positive" };
  }

  const idempotencyKey = options?.idempotencyKey || generateIdempotencyKey(userId, `credit_${sourceType}`, options?.referenceId);

  const { data: existingEntry } = await supabase
    .from("token_ledger")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (existingEntry) {
    return {
      success: true,
      entry: mapLedgerEntry(existingEntry),
      newBalance: existingEntry.balance_after,
    };
  }

  const { data: pool, error: poolError } = await supabase
    .from("token_pools")
    .insert({
      user_id: userId,
      source_type: sourceType,
      amount,
      remaining: amount,
      expires_at: options?.expiresAt?.toISOString() || null,
      rollover_eligible: options?.rolloverEligible || false,
      reference_id: options?.referenceId,
    })
    .select()
    .single();

  if (poolError) {
    return { success: false, error: `Failed to create pool: ${poolError.message}` };
  }

  const { data: lastEntry } = await supabase
    .from("token_ledger")
    .select("balance_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const currentBalance = lastEntry?.balance_after ?? 0;
  const newBalance = currentBalance + amount;

  const { data: entry, error: ledgerError } = await supabase
    .from("token_ledger")
    .insert({
      user_id: userId,
      amount,
      balance_after: newBalance,
      source_type: sourceType,
      action_type: options?.actionType || "grant",
      pool_id: pool.id,
      reference_id: options?.referenceId,
      idempotency_key: idempotencyKey,
      metadata: options?.metadata || {},
    })
    .select()
    .single();

  if (ledgerError) {
    return { success: false, error: `Failed to create ledger entry: ${ledgerError.message}` };
  }

  return {
    success: true,
    pool: mapTokenPool(pool),
    entry: mapLedgerEntry(entry),
    newBalance,
  };
}

export async function grantFreeDaily(userId: string): Promise<CreditResult> {
  const supabase = await createServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: existingPool } = await supabase
    .from("token_pools")
    .select("id")
    .eq("user_id", userId)
    .eq("source_type", "free")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .single();

  if (existingPool) {
    const balance = await getBalance(userId);
    return {
      success: true,
      newBalance: balance.currentBalance,
    };
  }

  return creditTokens(userId, FREE_DAILY_AMOUNT, "free", {
    expiresAt: tomorrow,
    idempotencyKey: `free_daily_${userId}_${today.toISOString().split("T")[0]}`,
    metadata: { type: "daily_grant" },
  });
}

export async function grantSubscriptionTokens(
  userId: string,
  plan: "free" | "basic" | "pro" | "enterprise",
  subscriptionId?: string
): Promise<CreditResult> {
  const amount = SUBSCRIPTION_TOKENS[plan];
  
  if (amount <= 0) {
    return { success: true, newBalance: (await getBalance(userId)).currentBalance };
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return creditTokens(userId, amount, "subscription", {
    expiresAt: periodEnd,
    rolloverEligible: plan === "pro",
    referenceId: subscriptionId,
    idempotencyKey: `subscription_${userId}_${new Date().toISOString().slice(0, 7)}`,
    metadata: { plan, period: new Date().toISOString().slice(0, 7) },
  });
}

export async function processExpiredPools(): Promise<{ processed: number; errors: string[] }> {
  const supabase = await createServiceClient();
  const now = new Date();
  const errors: string[] = [];
  let processed = 0;

  const { data: expiredPools } = await supabase
    .from("token_pools")
    .select("*")
    .gt("remaining", 0)
    .lt("expires_at", now.toISOString())
    .neq("source_type", "purchase");

  for (const pool of expiredPools || []) {
    const { data: lastEntry } = await supabase
      .from("token_ledger")
      .select("balance_after")
      .eq("user_id", pool.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentBalance = lastEntry?.balance_after ?? 0;
    const newBalance = currentBalance - pool.remaining;

    if (newBalance < 0) {
      errors.push(`Cannot expire pool ${pool.id}: would result in negative balance`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("token_pools")
      .update({ remaining: 0, updated_at: now.toISOString() })
      .eq("id", pool.id);

    if (updateError) {
      errors.push(`Failed to update pool ${pool.id}: ${updateError.message}`);
      continue;
    }

    await supabase.from("token_ledger").insert({
      user_id: pool.user_id,
      amount: -pool.remaining,
      balance_after: newBalance,
      source_type: "expiration",
      action_type: "expire",
      pool_id: pool.id,
      idempotency_key: `expire_${pool.id}`,
      metadata: { expired_pool: pool.id, original_amount: pool.amount },
    });

    processed++;
  }

  return { processed, errors };
}

export async function processRollover(
  userId: string,
  fromPlan: "pro",
  toPlan: "pro"
): Promise<{ rolledOver: number; expired: number }> {
  const supabase = await createServiceClient();
  const now = new Date();

  const { data: eligiblePools } = await supabase
    .from("token_pools")
    .select("*")
    .eq("user_id", userId)
    .eq("source_type", "subscription")
    .eq("rollover_eligible", true)
    .gt("remaining", 0);

  let totalRemaining = 0;
  for (const pool of eligiblePools || []) {
    totalRemaining += pool.remaining;
  }

  const rolloverAmount = Math.min(totalRemaining, PRO_ROLLOVER_CAP);
  const expiredAmount = totalRemaining - rolloverAmount;

  for (const pool of eligiblePools || []) {
    await supabase
      .from("token_pools")
      .update({ remaining: 0, updated_at: now.toISOString() })
      .eq("id", pool.id);
  }

  if (rolloverAmount > 0) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await creditTokens(userId, rolloverAmount, "rollover", {
      expiresAt: periodEnd,
      rolloverEligible: toPlan === "pro",
      idempotencyKey: `rollover_${userId}_${now.toISOString().slice(0, 7)}`,
      actionType: "rollover",
      metadata: { from_plan: fromPlan, to_plan: toPlan },
    });
  }

  if (expiredAmount > 0) {
    const { data: lastEntry } = await supabase
      .from("token_ledger")
      .select("balance_after")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentBalance = lastEntry?.balance_after ?? 0;

    await supabase.from("token_ledger").insert({
      user_id: userId,
      amount: -expiredAmount,
      balance_after: currentBalance - expiredAmount,
      source_type: "expiration",
      action_type: "expire",
      idempotency_key: `rollover_expire_${userId}_${now.toISOString().slice(0, 7)}`,
      metadata: { reason: "rollover_cap_exceeded", cap: PRO_ROLLOVER_CAP },
    });
  }

  return { rolledOver: rolloverAmount, expired: expiredAmount };
}

export async function adminGrantTokens(
  userId: string,
  amount: number,
  adminId: string,
  reason: string,
  expiresAt?: Date
): Promise<CreditResult> {
  return creditTokens(userId, amount, "admin", {
    expiresAt,
    referenceId: adminId,
    idempotencyKey: `admin_grant_${adminId}_${userId}_${Date.now()}`,
    actionType: "grant",
    metadata: { admin_id: adminId, reason },
  });
}

export async function adminRevokeTokens(
  userId: string,
  amount: number,
  adminId: string,
  reason: string
): Promise<DeductResult> {
  const supabase = await createServiceClient();

  const { data: lastEntry } = await supabase
    .from("token_ledger")
    .select("balance_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const currentBalance = lastEntry?.balance_after ?? 0;
  const revokeAmount = Math.min(amount, currentBalance);

  if (revokeAmount <= 0) {
    return { success: true, newBalance: currentBalance };
  }

  const newBalance = currentBalance - revokeAmount;

  const { data: entry, error } = await supabase
    .from("token_ledger")
    .insert({
      user_id: userId,
      amount: -revokeAmount,
      balance_after: newBalance,
      source_type: "admin",
      action_type: "revoke",
      reference_id: adminId,
      idempotency_key: `admin_revoke_${adminId}_${userId}_${Date.now()}`,
      metadata: { admin_id: adminId, reason, requested_amount: amount },
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    entry: mapLedgerEntry(entry),
    newBalance,
  };
}

export async function getLedgerHistory(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ entries: LedgerEntry[]; total: number }> {
  const supabase = await createServiceClient();

  const { data, count, error } = await supabase
    .from("token_ledger")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { entries: [], total: 0 };
  }

  return {
    entries: (data || []).map(mapLedgerEntry),
    total: count || 0,
  };
}

function mapLedgerEntry(row: Record<string, unknown>): LedgerEntry {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    amount: row.amount as number,
    balanceAfter: row.balance_after as number,
    sourceType: row.source_type as LedgerSourceType,
    actionType: row.action_type as LedgerActionType | null,
    poolId: row.pool_id as string | null,
    referenceId: row.reference_id as string | null,
    idempotencyKey: row.idempotency_key as string | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
  };
}

function mapTokenPool(row: Record<string, unknown>): TokenPool {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    sourceType: row.source_type as LedgerSourceType,
    amount: row.amount as number,
    remaining: row.remaining as number,
    expiresAt: row.expires_at as string | null,
    rolloverEligible: row.rollover_eligible as boolean,
    referenceId: row.reference_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
