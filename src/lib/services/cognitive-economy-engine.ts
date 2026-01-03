import { createServiceClient } from "@/lib/supabase/server";
import type { IllusionRiskLevel } from "@/lib/types/ethical-guardrails";
import {
  TokenClass,
  TokenState,
  TokenBalance,
  TokenLedgerEntry,
  TokenOperationType,
  TokenContextType,
  PricingFactors,
  PricingBreakdown,
  DynamicPricingConfig,
  SubscriptionTier,
  SubscriptionCapabilities,
  SimulationComplexityLevel,
  EvolutionSpeedLevel,
  ValueAmplifier,
  ValueAmplifierType,
  ActiveAmplifier,
  EconomicAdjustment,
  EconomicAdjustmentType,
  EthicalPricingModifier,
  UserEconomicState,
  SubscriptionStatus,
  TokenPackage,
  DEFAULT_DYNAMIC_PRICING_CONFIG,
  SUBSCRIPTION_TIERS,
  VALUE_AMPLIFIERS,
  ETHICAL_PRICING_MODIFIERS,
  TOKEN_PACKAGES,
} from "@/lib/types/cognitive-economy";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const ALL_TOKEN_CLASSES: TokenClass[] = [
  "core_interaction", "cognitive_depth", "evolution", "creation_fork",
  "compute_priority", "memory_preservation", "voice_avatar", "stabilization"
];

interface InteractionContext {
  interactionDepth: number;
  emotionalIntensity: number;
  simulationComplexity: SimulationComplexityLevel;
  stateComplexity: number;
  systemLoad: number;
  ethicalRiskLevel: IllusionRiskLevel;
}

export class CognitiveEconomyEngine {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;
  private config: DynamicPricingConfig = DEFAULT_DYNAMIC_PRICING_CONFIG;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async initializeUserEconomy(userId: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) return { success: true };

    await client.from("user_subscriptions").insert({
      user_id: userId,
      subscription_tier: "free",
      subscription_status: "active",
    });

    const freeGrant = SUBSCRIPTION_TIERS.free.tokenGrant.monthly;
    for (const tokenClass of ALL_TOKEN_CLASSES) {
      const amount = freeGrant[tokenClass] || 0;
      await client.from("token_balances").insert({
        user_id: userId,
        token_class: tokenClass,
        available: amount,
        locked: 0,
        staked: 0,
        pending_decay: 0,
        amplified_bonus: 0,
      });

      if (amount > 0) {
        await this.recordLedgerEntry(userId, tokenClass, amount, "available", "available", "subscription_grant", null, "subscription", null);
      }
    }

    return { success: true };
  }

  async calculateDynamicPrice(
    userId: string,
    contextType: TokenContextType,
    context: InteractionContext
  ): Promise<ServiceResult<PricingFactors>> {
    const subscription = await this.getUserSubscription(userId);
    const subscriptionTier = subscription?.tier || "free";
    const subscriptionCapabilities = SUBSCRIPTION_TIERS[subscriptionTier];

    const basePrice = this.config.basePrices[contextType];

    const depthMultiplier = this.calculateDepthMultiplier(context.interactionDepth);
    const emotionalMultiplier = this.calculateEmotionalMultiplier(context.emotionalIntensity);
    const simulationMultiplier = this.config.simulationMultipliers[context.simulationComplexity];
    const loadMultiplier = this.calculateLoadMultiplier(context.systemLoad);
    const ethicalMultiplier = ETHICAL_PRICING_MODIFIERS[context.ethicalRiskLevel].priceMultiplier;

    const subscriptionDiscount = this.calculateSubscriptionDiscount(subscriptionTier);

    const breakdown: PricingBreakdown = {
      baseCost: basePrice,
      depthCost: basePrice * (depthMultiplier - 1),
      emotionalCost: basePrice * (emotionalMultiplier - 1),
      simulationCost: basePrice * (simulationMultiplier - 1),
      complexityCost: basePrice * (context.stateComplexity / 100),
      loadSurcharge: basePrice * (loadMultiplier - 1),
      ethicalAdjustment: basePrice * (ethicalMultiplier - 1),
      discountApplied: 0,
    };

    let rawPrice = basePrice * depthMultiplier * emotionalMultiplier * simulationMultiplier * loadMultiplier * ethicalMultiplier;
    rawPrice += breakdown.complexityCost;

    const discountAmount = rawPrice * subscriptionDiscount;
    breakdown.discountApplied = discountAmount;

    const finalPrice = Math.max(1, Math.ceil(rawPrice - discountAmount));

    return {
      success: true,
      data: {
        basePrice,
        interactionDepthMultiplier: depthMultiplier,
        emotionalIntensityMultiplier: emotionalMultiplier,
        simulationLayerMultiplier: simulationMultiplier,
        stateComplexityMultiplier: 1 + context.stateComplexity / 100,
        systemLoadMultiplier: loadMultiplier,
        ethicalRiskMultiplier: ethicalMultiplier,
        subscriptionDiscount,
        finalPrice,
        breakdown,
      },
    };
  }

  private calculateDepthMultiplier(depth: number): number {
    const thresholds = this.config.depthMultipliers.thresholds;
    if (depth >= thresholds.profound) return this.config.depthMultipliers.profound;
    if (depth >= thresholds.deep) return this.config.depthMultipliers.deep;
    if (depth >= thresholds.moderate) return this.config.depthMultipliers.moderate;
    return this.config.depthMultipliers.shallow;
  }

  private calculateEmotionalMultiplier(intensity: number): number {
    const thresholds = this.config.emotionalMultipliers.thresholds;
    if (intensity >= thresholds.intense) return this.config.emotionalMultipliers.intense;
    if (intensity >= thresholds.high) return this.config.emotionalMultipliers.high;
    if (intensity >= thresholds.medium) return this.config.emotionalMultipliers.medium;
    return this.config.emotionalMultipliers.low;
  }

  private calculateLoadMultiplier(load: number): number {
    const thresholds = this.config.loadMultipliers.thresholds;
    if (load >= thresholds.critical) return this.config.loadMultipliers.critical;
    if (load >= thresholds.high) return this.config.loadMultipliers.high;
    if (load >= thresholds.normal) return this.config.loadMultipliers.normal;
    return this.config.loadMultipliers.low;
  }

  private calculateSubscriptionDiscount(tier: SubscriptionTier): number {
    const discounts: Record<SubscriptionTier, number> = {
      free: 0,
      creator: 0.1,
      professional: 0.2,
      enterprise: 0.3,
    };
    return discounts[tier];
  }

  async consumeTokens(
    userId: string,
    tokenClass: TokenClass,
    amount: number,
    contextType: TokenContextType,
    contextId: string | null,
    pricingFactors: PricingFactors | null
  ): Promise<ServiceResult<{ consumed: number; remaining: number }>> {
    const client = await this.getClient();

    const balance = await this.getTokenBalance(userId, tokenClass);
    if (!balance || balance.available < amount) {
      return {
        success: false,
        error: `Insufficient ${tokenClass} tokens. Required: ${amount}, Available: ${balance?.available || 0}`,
      };
    }

    const newAvailable = balance.available - amount;

    await client.from("token_balances")
      .update({
        available: newAvailable,
        last_updated_at: Date.now(),
      })
      .eq("user_id", userId)
      .eq("token_class", tokenClass);

    await this.recordLedgerEntry(
      userId,
      tokenClass,
      -amount,
      "available",
      "consumed",
      "consume",
      contextId,
      contextType,
      pricingFactors
    );

    await this.recordPricingSnapshot(userId, contextType, contextId, pricingFactors, amount, tokenClass);

    return {
      success: true,
      data: { consumed: amount, remaining: newAvailable },
    };
  }

  async grantTokens(
    userId: string,
    tokenClass: TokenClass,
    amount: number,
    operationType: TokenOperationType,
    contextType: TokenContextType,
    metadata?: Record<string, unknown>
  ): Promise<ServiceResult<{ granted: number; newBalance: number }>> {
    const client = await this.getClient();

    const balance = await this.getTokenBalance(userId, tokenClass);
    const currentAvailable = balance?.available || 0;
    const newAvailable = currentAvailable + amount;

    if (balance) {
      await client.from("token_balances")
        .update({
          available: newAvailable,
          last_updated_at: Date.now(),
        })
        .eq("user_id", userId)
        .eq("token_class", tokenClass);
    } else {
      await client.from("token_balances").insert({
        user_id: userId,
        token_class: tokenClass,
        available: amount,
        locked: 0,
        staked: 0,
        pending_decay: 0,
        amplified_bonus: 0,
      });
    }

    await this.recordLedgerEntry(
      userId,
      tokenClass,
      amount,
      "available",
      "available",
      operationType,
      null,
      contextType,
      null,
      metadata
    );

    return {
      success: true,
      data: { granted: amount, newBalance: newAvailable },
    };
  }

  async lockTokens(
    userId: string,
    tokenClass: TokenClass,
    amount: number,
    reason: string
  ): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const balance = await this.getTokenBalance(userId, tokenClass);
    if (!balance || balance.available < amount) {
      return { success: false, error: "Insufficient available tokens to lock" };
    }

    await client.from("token_balances")
      .update({
        available: balance.available - amount,
        locked: balance.locked + amount,
        last_updated_at: Date.now(),
      })
      .eq("user_id", userId)
      .eq("token_class", tokenClass);

    await this.recordLedgerEntry(userId, tokenClass, amount, "available", "locked", "lock", null, null, null, { reason });

    return { success: true };
  }

  async unlockTokens(
    userId: string,
    tokenClass: TokenClass,
    amount: number
  ): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const balance = await this.getTokenBalance(userId, tokenClass);
    if (!balance || balance.locked < amount) {
      return { success: false, error: "Insufficient locked tokens to unlock" };
    }

    await client.from("token_balances")
      .update({
        available: balance.available + amount,
        locked: balance.locked - amount,
        last_updated_at: Date.now(),
      })
      .eq("user_id", userId)
      .eq("token_class", tokenClass);

    await this.recordLedgerEntry(userId, tokenClass, amount, "locked", "available", "unlock", null, null, null);

    return { success: true };
  }

  async stakeTokens(
    userId: string,
    tokenClass: TokenClass,
    amount: number,
    duration: number
  ): Promise<ServiceResult<{ stakingBonus: number }>> {
    const client = await this.getClient();

    const balance = await this.getTokenBalance(userId, tokenClass);
    if (!balance || balance.available < amount) {
      return { success: false, error: "Insufficient tokens to stake" };
    }

    const stakingBonus = amount * this.config.amplificationConfig.stakingBonusRate * (duration / 86400000);
    const cappedBonus = Math.min(stakingBonus, amount * (this.config.amplificationConfig.maxAmplification - 1));

    await client.from("token_balances")
      .update({
        available: balance.available - amount,
        staked: balance.staked + amount,
        amplified_bonus: balance.amplifiedBonus + cappedBonus,
        last_updated_at: Date.now(),
      })
      .eq("user_id", userId)
      .eq("token_class", tokenClass);

    await this.recordLedgerEntry(userId, tokenClass, amount, "available", "staked", "stake", null, null, null, { duration, expectedBonus: cappedBonus });

    return { success: true, data: { stakingBonus: cappedBonus } };
  }

  async activateAmplifier(
    userId: string,
    amplifierId: string,
    characterId?: string
  ): Promise<ServiceResult<ActiveAmplifier>> {
    const client = await this.getClient();
    const now = Date.now();

    const amplifier = VALUE_AMPLIFIERS.find(a => a.amplifierId === amplifierId);
    if (!amplifier) {
      return { success: false, error: "Unknown amplifier" };
    }

    const consumeResult = await this.consumeTokens(
      userId,
      amplifier.tokenClass,
      amplifier.tokenCost,
      "compute_boost",
      amplifierId,
      null
    );

    if (!consumeResult.success) {
      return { success: false, error: consumeResult.error };
    }

    if (!amplifier.stackable) {
      const { data: existing } = await client
        .from("active_amplifiers")
        .select("*")
        .eq("user_id", userId)
        .eq("amplifier_type", amplifier.amplifierType)
        .eq("is_active", true)
        .single();

      if (existing) {
        return { success: false, error: "Amplifier already active and not stackable" };
      }
    }

    const expiresAt = amplifier.duration ? now + amplifier.duration : null;

    const { data: activeAmplifier } = await client.from("active_amplifiers")
      .insert({
        user_id: userId,
        character_id: characterId || null,
        amplifier_id: amplifierId,
        amplifier_type: amplifier.amplifierType,
        activated_at: now,
        expires_at: expiresAt,
        stack_count: 1,
        effect: amplifier.effect,
      })
      .select()
      .single();

    return {
      success: true,
      data: {
        amplifierId,
        amplifierType: amplifier.amplifierType,
        activatedAt: now,
        expiresAt,
        stackCount: 1,
        effect: amplifier.effect,
      },
    };
  }

  async getActiveAmplifiers(
    userId: string,
    characterId?: string
  ): Promise<ServiceResult<ActiveAmplifier[]>> {
    const client = await this.getClient();
    const now = Date.now();

    let query = client
      .from("active_amplifiers")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (characterId) {
      query = query.or(`character_id.eq.${characterId},character_id.is.null`);
    }

    const { data } = await query;

    const amplifiers: ActiveAmplifier[] = [];
    for (const row of data || []) {
      if (row.expires_at && row.expires_at < now) {
        await client.from("active_amplifiers")
          .update({ is_active: false })
          .eq("id", row.id);
        continue;
      }

      amplifiers.push({
        amplifierId: row.amplifier_id,
        amplifierType: row.amplifier_type,
        activatedAt: Number(row.activated_at),
        expiresAt: row.expires_at ? Number(row.expires_at) : null,
        stackCount: row.stack_count,
        effect: row.effect,
      });
    }

    return { success: true, data: amplifiers };
  }

  async applyEthicalEconomicGovernance(
    userId: string,
    characterId: string,
    riskLevel: IllusionRiskLevel
  ): Promise<ServiceResult<EconomicAdjustment[]>> {
    const client = await this.getClient();
    const now = Date.now();

    const modifier = ETHICAL_PRICING_MODIFIERS[riskLevel];
    const adjustments: EconomicAdjustment[] = [];

    if (modifier.priceMultiplier > 1) {
      const priceAdjustment: EconomicAdjustment = {
        adjustmentType: "price_increase",
        magnitude: modifier.priceMultiplier,
        reason: `Ethical governance: ${riskLevel} risk level detected`,
        appliedAt: now,
        expiresAt: modifier.cooldownMs > 0 ? now + modifier.cooldownMs : null,
      };

      await client.from("economic_adjustments").insert({
        user_id: userId,
        character_id: characterId,
        adjustment_type: "price_increase",
        magnitude: modifier.priceMultiplier,
        reason: priceAdjustment.reason,
        applied_at: now,
        expires_at: priceAdjustment.expiresAt,
      });

      adjustments.push(priceAdjustment);
    }

    if (modifier.depthCap !== null) {
      const depthAdjustment: EconomicAdjustment = {
        adjustmentType: "depth_reduction",
        magnitude: modifier.depthCap,
        reason: `Cognitive depth capped at ${modifier.depthCap}% for wellbeing`,
        appliedAt: now,
        expiresAt: now + modifier.cooldownMs,
      };

      await client.from("economic_adjustments").insert({
        user_id: userId,
        character_id: characterId,
        adjustment_type: "depth_reduction",
        magnitude: modifier.depthCap,
        reason: depthAdjustment.reason,
        applied_at: now,
        expires_at: depthAdjustment.expiresAt,
      });

      adjustments.push(depthAdjustment);
    }

    if (modifier.cooldownMs > 0) {
      const cooldownAdjustment: EconomicAdjustment = {
        adjustmentType: "cooldown_required",
        magnitude: modifier.cooldownMs,
        reason: "Suggested break period for healthy interaction",
        appliedAt: now,
        expiresAt: now + modifier.cooldownMs,
      };

      adjustments.push(cooldownAdjustment);
    }

    if (modifier.breakIncentive > 0) {
      const incentiveAdjustment: EconomicAdjustment = {
        adjustmentType: "incentive_break",
        magnitude: modifier.breakIncentive,
        reason: `${modifier.breakIncentive} bonus tokens available after taking a break`,
        appliedAt: now,
        expiresAt: null,
      };

      adjustments.push(incentiveAdjustment);
    }

    await client.from("ethical_economic_governance").upsert({
      user_id: userId,
      character_id: characterId,
      current_risk_level: riskLevel,
      last_assessed_at: now,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,character_id" });

    return { success: true, data: adjustments };
  }

  async processSubscriptionGrant(
    userId: string,
    tier: SubscriptionTier
  ): Promise<ServiceResult<Record<TokenClass, number>>> {
    const client = await this.getClient();
    const now = Date.now();

    const capabilities = SUBSCRIPTION_TIERS[tier];
    const monthlyGrant = capabilities.tokenGrant.monthly;
    const bonusGrant = capabilities.tokenGrant.bonus;

    const granted: Record<TokenClass, number> = {} as Record<TokenClass, number>;

    for (const tokenClass of ALL_TOKEN_CLASSES) {
      const monthlyAmount = monthlyGrant[tokenClass] || 0;
      const bonusAmount = bonusGrant[tokenClass] || 0;
      const totalAmount = monthlyAmount + bonusAmount;

      if (totalAmount > 0) {
        await this.grantTokens(userId, tokenClass, totalAmount, "subscription_grant", "subscription");
        granted[tokenClass] = totalAmount;
      }
    }

    const periodStart = now;
    const periodEnd = now + 30 * 86400000;

    await client.from("subscription_token_grants").insert({
      user_id: userId,
      subscription_tier: tier,
      grant_period_start: periodStart,
      grant_period_end: periodEnd,
      tokens_granted: granted,
      rollover_tokens: {},
    });

    return { success: true, data: granted };
  }

  async checkCapabilityAccess(
    userId: string,
    capability: keyof SubscriptionCapabilities["capabilityLimits"],
    requestedValue: number
  ): Promise<ServiceResult<{ allowed: boolean; limit: number | string; current: number }>> {
    const subscription = await this.getUserSubscription(userId);
    const tier = subscription?.tier || "free";
    const capabilities = SUBSCRIPTION_TIERS[tier].capabilityLimits;

    const limit = capabilities[capability];

    if (limit === -1) {
      return { success: true, data: { allowed: true, limit: "unlimited", current: requestedValue } };
    }

    const allowed = typeof limit === "number" ? requestedValue <= limit : true;

    return {
      success: true,
      data: { allowed, limit, current: requestedValue },
    };
  }

  async getUserEconomicState(userId: string): Promise<ServiceResult<UserEconomicState>> {
    const client = await this.getClient();

    const { data: subscription } = await client
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { data: balances } = await client
      .from("token_balances")
      .select("*")
      .eq("user_id", userId);

    const { data: amplifiers } = await client
      .from("active_amplifiers")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: adjustments } = await client
      .from("economic_adjustments")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const tokenBalances = new Map<TokenClass, TokenBalance>();
    for (const b of balances || []) {
      tokenBalances.set(b.token_class as TokenClass, {
        userId,
        tokenClass: b.token_class as TokenClass,
        available: Number(b.available),
        locked: Number(b.locked),
        staked: Number(b.staked),
        pendingDecay: Number(b.pending_decay),
        amplifiedBonus: Number(b.amplified_bonus),
        lastUpdatedAt: Number(b.last_updated_at),
      });
    }

    const activeAmplifiers: ActiveAmplifier[] = (amplifiers || []).map(a => ({
      amplifierId: a.amplifier_id,
      amplifierType: a.amplifier_type as ValueAmplifierType,
      activatedAt: Number(a.activated_at),
      expiresAt: a.expires_at ? Number(a.expires_at) : null,
      stackCount: a.stack_count,
      effect: a.effect,
    }));

    const economicAdjustments: EconomicAdjustment[] = (adjustments || []).map(a => ({
      adjustmentType: a.adjustment_type as EconomicAdjustmentType,
      magnitude: Number(a.magnitude),
      reason: a.reason,
      appliedAt: Number(a.applied_at),
      expiresAt: a.expires_at ? Number(a.expires_at) : null,
    }));

    return {
      success: true,
      data: {
        userId,
        subscriptionTier: (subscription?.subscription_tier || "free") as SubscriptionTier,
        subscriptionStatus: (subscription?.subscription_status || "active") as SubscriptionStatus,
        tokenBalances,
        activeAmplifiers,
        economicAdjustments,
        usageStreak: subscription?.usage_streak || 0,
        lastInteractionAt: subscription?.last_interaction_at || 0,
        createdAt: subscription ? new Date(subscription.created_at).getTime() : Date.now(),
      },
    };
  }

  async getTokenBalance(userId: string, tokenClass: TokenClass): Promise<TokenBalance | null> {
    const client = await this.getClient();

    const { data } = await client
      .from("token_balances")
      .select("*")
      .eq("user_id", userId)
      .eq("token_class", tokenClass)
      .single();

    if (!data) return null;

    return {
      userId,
      tokenClass,
      available: Number(data.available),
      locked: Number(data.locked),
      staked: Number(data.staked),
      pendingDecay: Number(data.pending_decay),
      amplifiedBonus: Number(data.amplified_bonus),
      lastUpdatedAt: Number(data.last_updated_at),
    };
  }

  async getAllTokenBalances(userId: string): Promise<ServiceResult<Map<TokenClass, TokenBalance>>> {
    const client = await this.getClient();

    const { data } = await client
      .from("token_balances")
      .select("*")
      .eq("user_id", userId);

    const balances = new Map<TokenClass, TokenBalance>();

    for (const row of data || []) {
      balances.set(row.token_class as TokenClass, {
        userId,
        tokenClass: row.token_class as TokenClass,
        available: Number(row.available),
        locked: Number(row.locked),
        staked: Number(row.staked),
        pendingDecay: Number(row.pending_decay),
        amplifiedBonus: Number(row.amplified_bonus),
        lastUpdatedAt: Number(row.last_updated_at),
      });
    }

    return { success: true, data: balances };
  }

  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    tokenClass?: TokenClass
  ): Promise<ServiceResult<TokenLedgerEntry[]>> {
    const client = await this.getClient();

    let query = client
      .from("token_ledger")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tokenClass) {
      query = query.eq("token_class", tokenClass);
    }

    const { data } = await query;

    const entries: TokenLedgerEntry[] = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      tokenClass: row.token_class as TokenClass,
      amount: Number(row.amount),
      previousState: row.previous_state as TokenState,
      newState: row.new_state as TokenState,
      operationType: row.operation_type as TokenOperationType,
      contextId: row.context_id,
      contextType: row.context_type as TokenContextType,
      pricingFactors: row.pricing_factors,
      metadata: row.metadata || {},
      createdAt: Number(row.created_at),
    }));

    return { success: true, data: entries };
  }

  private async getUserSubscription(userId: string): Promise<{ tier: SubscriptionTier; status: SubscriptionStatus } | null> {
    const client = await this.getClient();

    const { data } = await client
      .from("user_subscriptions")
      .select("subscription_tier, subscription_status")
      .eq("user_id", userId)
      .single();

    if (!data) return null;

    return {
      tier: data.subscription_tier as SubscriptionTier,
      status: data.subscription_status as SubscriptionStatus,
    };
  }

  private async recordLedgerEntry(
    userId: string,
    tokenClass: TokenClass,
    amount: number,
    previousState: TokenState,
    newState: TokenState,
    operationType: TokenOperationType,
    contextId: string | null,
    contextType: TokenContextType | null,
    pricingFactors: PricingFactors | null,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const client = await this.getClient();

    await client.from("token_ledger").insert({
      user_id: userId,
      token_class: tokenClass,
      amount,
      previous_state: previousState,
      new_state: newState,
      operation_type: operationType,
      context_id: contextId,
      context_type: contextType,
      pricing_factors: pricingFactors,
      metadata: metadata || {},
      created_at: Date.now(),
    });
  }

  private async recordPricingSnapshot(
    userId: string,
    contextType: TokenContextType,
    contextId: string | null,
    pricingFactors: PricingFactors | null,
    amount: number,
    tokenClass: TokenClass
  ): Promise<void> {
    const client = await this.getClient();

    await client.from("pricing_snapshots").insert({
      user_id: userId,
      context_type: contextType,
      context_id: contextId,
      pricing_factors: pricingFactors || {},
      final_price: pricingFactors?.finalPrice || amount,
      tokens_consumed: { [tokenClass]: amount },
      created_at: Date.now(),
    });
  }

  getSubscriptionTiers(): Record<SubscriptionTier, SubscriptionCapabilities> {
    return SUBSCRIPTION_TIERS;
  }

  getValueAmplifiers(): ValueAmplifier[] {
    return VALUE_AMPLIFIERS;
  }

  getTokenPackages(): TokenPackage[] {
    return TOKEN_PACKAGES;
  }
}

export const cognitiveEconomyEngine = new CognitiveEconomyEngine();
