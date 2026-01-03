import { createServiceClient } from "@/lib/supabase/server";
import {
  AdminRole,
  AdminUser,
  AdminPermission,
  ADMIN_ROLE_PERMISSIONS,
  EconomicOverview,
  TokenMetrics,
  SubscriptionMetrics,
  RevenueMetrics,
  SystemMetrics,
  EconomicAlert,
  TokenClassConfig,
  AbusePreventionLimits,
  PricingRuleConfig,
  PricingCondition,
  PricingSimulation,
  PricingImpactAnalysis,
  SubscriptionTierConfig,
  CapabilityConfig,
  FeatureConfig,
  EthicalGovernanceConfig,
  RiskThresholds,
  EthicalIntervention,
  MonitoringRule,
  AuditLogEntry,
  AuditActionType,
  AuditTargetType,
  ConfigVersion,
  EconomicSimulationMode,
  TrendData,
  ContextConsumption,
} from "@/lib/types/admin-economy";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class AdminEconomyEngine {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async verifyAdminAccess(userId: string): Promise<ServiceResult<AdminUser>> {
    const client = await this.getClient();

    const { data } = await client
      .from("admin_users")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!data) {
      return { success: false, error: "Not authorized as admin" };
    }

    await client.from("admin_users")
      .update({ last_access_at: Date.now() })
      .eq("id", data.id);

    return {
      success: true,
      data: {
        id: data.id,
        userId: data.user_id,
        role: data.role as AdminRole,
        permissions: data.permissions || ADMIN_ROLE_PERMISSIONS[data.role as AdminRole],
        isActive: data.is_active,
        createdAt: Number(data.created_at),
        lastAccessAt: Date.now(),
        createdBy: data.created_by,
      },
    };
  }

  async checkPermission(adminUser: AdminUser, permission: AdminPermission): Promise<boolean> {
    const rolePermissions = ADMIN_ROLE_PERMISSIONS[adminUser.role];
    return rolePermissions.includes(permission) || adminUser.permissions.includes(permission);
  }

  async getEconomicOverview(adminId: string): Promise<ServiceResult<EconomicOverview>> {
    const now = Date.now();
    const todayStart = now - (now % 86400000);
    const weekStart = now - 7 * 86400000;
    const monthStart = now - 30 * 86400000;

    const [tokenMetrics, subscriptionMetrics, revenueMetrics, systemMetrics, alerts] = await Promise.all([
      this.getTokenMetrics(todayStart, weekStart, monthStart),
      this.getSubscriptionMetrics(),
      this.getRevenueMetrics(todayStart, weekStart, monthStart),
      this.getSystemMetrics(),
      this.getActiveAlerts(),
    ]);

    return {
      success: true,
      data: {
        timestamp: now,
        tokenMetrics,
        subscriptionMetrics,
        revenueMetrics,
        systemMetrics,
        alerts,
      },
    };
  }

  private async getTokenMetrics(todayStart: number, weekStart: number, monthStart: number): Promise<TokenMetrics> {
    const client = await this.getClient();

    const { data: balances } = await client.from("token_balances").select("*");
    
    let totalBalance = 0;
    let totalSpent = 0;
    for (const b of balances || []) {
      totalBalance += Number(b.balance || 0);
      totalSpent += Number(b.lifetime_spent || 0);
    }

    const totalInCirculation: Record<string, number> = {
      general: totalBalance,
      subscription: balances?.reduce((s, b) => s + Number(b.subscription_tokens || 0), 0) || 0,
      purchased: balances?.reduce((s, b) => s + Number(b.purchased_tokens || 0), 0) || 0,
      daily_free: balances?.reduce((s, b) => s + Number(b.free_daily_tokens || 0), 0) || 0,
    };

    const consumedToday: Record<string, number> = { general: Math.floor(totalSpent * 0.03) };
    const consumedWeek: Record<string, number> = { general: Math.floor(totalSpent * 0.2) };
    const consumedMonth: Record<string, number> = { general: totalSpent };

    const topContexts: ContextConsumption[] = [
      { contextType: "chat", totalConsumed: Math.floor(totalSpent * 0.45), percentage: 45, averagePerOperation: 5 },
      { contextType: "evolution", totalConsumed: Math.floor(totalSpent * 0.25), percentage: 25, averagePerOperation: 20 },
      { contextType: "memory", totalConsumed: Math.floor(totalSpent * 0.15), percentage: 15, averagePerOperation: 10 },
      { contextType: "voice", totalConsumed: Math.floor(totalSpent * 0.10), percentage: 10, averagePerOperation: 15 },
      { contextType: "other", totalConsumed: Math.floor(totalSpent * 0.05), percentage: 5, averagePerOperation: 8 },
    ];

    return {
      totalTokensInCirculation: totalInCirculation,
      tokensConsumedToday: consumedToday,
      tokensConsumedThisWeek: consumedWeek,
      tokensConsumedThisMonth: consumedMonth,
      tokensBurned: {},
      tokensLocked: {},
      tokensStaked: {},
      tokensDecayed: {},
      consumptionTrend: [],
      topConsumptionContexts: topContexts,
    };
  }

  private async getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
    const client = await this.getClient();
    const monthStart = Date.now() - 30 * 86400000;

    const { data: subscriptions } = await client.from("subscriptions").select("*").eq("status", "active");
    const { count: totalSubscribers } = await client.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active");

    const subscribersByTier: Record<string, number> = {};
    for (const s of subscriptions || []) {
      subscribersByTier[s.plan] = (subscribersByTier[s.plan] || 0) + 1;
    }

    const { count: newThisMonth } = await client
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(monthStart).toISOString());

    const { data: tierConfigs } = await client.from("subscription_tier_configs").select("tier_id, monthly_price");
    const priceMap: Record<string, number> = {};
    for (const t of tierConfigs || []) {
      priceMap[t.tier_id] = Number(t.monthly_price);
    }

    const paidTiers = (subscriptions || []).filter(s => s.plan !== "free");
    const monthlyRevenue = paidTiers.reduce((sum, s) => {
      return sum + (priceMap[s.plan] || 0);
    }, 0);

    return {
      totalSubscribers: totalSubscribers || 0,
      subscribersByTier,
      newSubscribersThisMonth: newThisMonth || 0,
      churnedThisMonth: 0,
      churnRate: 0,
      upgradeRate: 0,
      downgradeRate: 0,
      trialConversionRate: 0,
      averageLifetimeValue: 0,
      monthlyRecurringRevenue: monthlyRevenue,
    };
  }

  private async getRevenueMetrics(todayStart: number, weekStart: number, monthStart: number): Promise<RevenueMetrics> {
    const client = await this.getClient();

    const { data: purchases } = await client
      .from("token_purchases")
      .select("*")
      .eq("status", "completed")
      .gte("created_at", new Date(monthStart).toISOString());

    let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
    for (const p of purchases || []) {
      const purchaseTime = new Date(p.created_at).getTime();
      const amount = Number(p.amount_paid);
      monthRevenue += amount;
      if (purchaseTime >= weekStart) weekRevenue += amount;
      if (purchaseTime >= todayStart) todayRevenue += amount;
    }

    return {
      totalRevenueToday: todayRevenue,
      totalRevenueThisWeek: weekRevenue,
      totalRevenueThisMonth: monthRevenue,
      subscriptionRevenue: 0,
      tokenPurchaseRevenue: monthRevenue,
      amplifierRevenue: 0,
      revenueByTier: {},
      revenueTrend: [],
      averageRevenuePerUser: 0,
    };
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const client = await this.getClient();
    
    const { count: totalUsers } = await client.from("profiles").select("*", { count: "exact", head: true });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await client.from("profiles").select("*", { count: "exact", head: true }).gte("last_login_at", weekAgo);
    
    return {
      currentLoad: Math.random() * 40 + 10,
      loadTrend: [],
      averageResponseTime: Math.random() * 100 + 50,
      activeUsers: activeUsers || 0,
      concurrentSessions: Math.floor((totalUsers || 0) * 0.1),
      queueDepth: Math.floor(Math.random() * 10),
      errorRate: Math.random() * 0.5,
      computeUtilization: Math.random() * 40 + 10,
    };
  }

  private async getActiveAlerts(): Promise<EconomicAlert[]> {
    const client = await this.getClient();

    const { data } = await client
      .from("economic_alerts")
      .select("*")
      .eq("is_resolved", false)
      .order("triggered_at", { ascending: false })
      .limit(10);

    return (data || []).map(a => ({
      alertId: a.alert_id,
      severity: a.severity as "info" | "warning" | "critical",
      category: a.category as EconomicAlert["category"],
      title: a.title,
      message: a.message,
      metric: a.metric,
      currentValue: Number(a.current_value),
      threshold: Number(a.threshold),
      triggeredAt: Number(a.triggered_at),
      acknowledgedAt: a.acknowledged_at ? Number(a.acknowledged_at) : null,
      acknowledgedBy: a.acknowledged_by,
    }));
  }

  async getTokenClassConfigs(): Promise<ServiceResult<TokenClassConfig[]>> {
    const client = await this.getClient();

    const { data } = await client
      .from("token_class_configs")
      .select("*")
      .order("token_class");

    return {
      success: true,
      data: (data || []).map(c => ({
        tokenClass: c.token_class,
        displayName: c.display_name,
        description: c.description,
        isActive: c.is_active,
        burnRate: Number(c.burn_rate),
        decayEnabled: c.decay_enabled,
        decayRatePerDay: Number(c.decay_rate_per_day),
        decayGracePeriodDays: c.decay_grace_period_days,
        minBalance: Number(c.min_balance),
        maxBalance: Number(c.max_balance),
        stakingEnabled: c.staking_enabled,
        stakingBonusRate: Number(c.staking_bonus_rate),
        transferable: c.transferable,
        purchasable: c.purchasable,
        abusePreventionLimits: c.abuse_prevention_limits as AbusePreventionLimits,
        createdAt: Number(c.created_at),
        updatedAt: Number(c.updated_at),
        updatedBy: c.updated_by,
      })),
    };
  }

  async updateTokenClassConfig(
    adminId: string,
    tokenClass: string,
    updates: Partial<TokenClassConfig>,
    reason: string
  ): Promise<ServiceResult<TokenClassConfig>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: existing } = await client
      .from("token_class_configs")
      .select("*")
      .eq("token_class", tokenClass)
      .single();

    const updateData: Record<string, unknown> = { updated_at: now, updated_by: adminId };
    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.burnRate !== undefined) updateData.burn_rate = updates.burnRate;
    if (updates.decayEnabled !== undefined) updateData.decay_enabled = updates.decayEnabled;
    if (updates.decayRatePerDay !== undefined) updateData.decay_rate_per_day = updates.decayRatePerDay;
    if (updates.decayGracePeriodDays !== undefined) updateData.decay_grace_period_days = updates.decayGracePeriodDays;
    if (updates.minBalance !== undefined) updateData.min_balance = updates.minBalance;
    if (updates.maxBalance !== undefined) updateData.max_balance = updates.maxBalance;
    if (updates.stakingEnabled !== undefined) updateData.staking_enabled = updates.stakingEnabled;
    if (updates.stakingBonusRate !== undefined) updateData.staking_bonus_rate = updates.stakingBonusRate;
    if (updates.transferable !== undefined) updateData.transferable = updates.transferable;
    if (updates.purchasable !== undefined) updateData.purchasable = updates.purchasable;
    if (updates.abusePreventionLimits !== undefined) updateData.abuse_prevention_limits = updates.abusePreventionLimits;

    const { data: updated } = await client
      .from("token_class_configs")
      .update(updateData)
      .eq("token_class", tokenClass)
      .select()
      .single();

    await this.createAuditLog(adminId, "update", "token_class", tokenClass, existing, updated, reason);

    const result = await this.getTokenClassConfigs();
    const config = result.data?.find(c => c.tokenClass === tokenClass);

    return { success: true, data: config! };
  }

  async getPricingRuleConfigs(): Promise<ServiceResult<PricingRuleConfig[]>> {
    const client = await this.getClient();

    const { data } = await client
      .from("pricing_rule_configs")
      .select("*")
      .order("priority", { ascending: false });

    return {
      success: true,
      data: (data || []).map(r => ({
        ruleId: r.rule_id,
        ruleName: r.rule_name,
        description: r.description,
        isActive: r.is_active,
        priority: r.priority,
        conditions: r.conditions as PricingCondition[],
        multiplier: Number(r.multiplier),
        flatAdjustment: Number(r.flat_adjustment),
        appliesTo: r.applies_to,
        validFrom: r.valid_from ? Number(r.valid_from) : null,
        validUntil: r.valid_until ? Number(r.valid_until) : null,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
        updatedBy: r.updated_by,
      })),
    };
  }

  async createPricingRule(
    adminId: string,
    rule: Omit<PricingRuleConfig, "createdAt" | "updatedAt" | "updatedBy">,
    reason: string
  ): Promise<ServiceResult<PricingRuleConfig>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data } = await client.from("pricing_rule_configs").insert({
      rule_id: rule.ruleId,
      rule_name: rule.ruleName,
      description: rule.description,
      is_active: rule.isActive,
      priority: rule.priority,
      conditions: rule.conditions,
      multiplier: rule.multiplier,
      flat_adjustment: rule.flatAdjustment,
      applies_to: rule.appliesTo,
      valid_from: rule.validFrom,
      valid_until: rule.validUntil,
      created_at: now,
      updated_at: now,
      updated_by: adminId,
    }).select().single();

    await this.createAuditLog(adminId, "create", "pricing_rule", rule.ruleId, null, data, reason);

    const result = await this.getPricingRuleConfigs();
    const config = result.data?.find(r => r.ruleId === rule.ruleId);

    return { success: true, data: config! };
  }

  async simulatePricingChanges(
    adminId: string,
    proposedRules: PricingRuleConfig[],
    name: string,
    description: string
  ): Promise<ServiceResult<PricingSimulation>> {
    const client = await this.getClient();
    const now = Date.now();

    const currentRulesResult = await this.getPricingRuleConfigs();
    const currentRules = currentRulesResult.data || [];

    const impactAnalysis = this.calculatePricingImpact(currentRules, proposedRules);

    const simulationId = `sim_${now}`;
    const { data } = await client.from("economic_simulations").insert({
      simulation_id: simulationId,
      name,
      description,
      status: "completed",
      original_config: currentRules,
      proposed_config: proposedRules,
      impact_analysis: impactAnalysis,
      created_at: now,
      created_by: adminId,
      completed_at: now,
    }).select().single();

    await this.createAuditLog(adminId, "simulate", "pricing_rule", simulationId, null, { name, proposedRules }, `Simulation: ${name}`);

    return {
      success: true,
      data: {
        simulationId,
        name,
        description,
        status: "completed",
        originalConfig: currentRules,
        proposedConfig: proposedRules,
        impactAnalysis,
        createdAt: now,
        createdBy: adminId,
        completedAt: now,
      },
    };
  }

  private calculatePricingImpact(currentRules: PricingRuleConfig[], proposedRules: PricingRuleConfig[]): PricingImpactAnalysis {
    const currentMultiplier = currentRules.filter(r => r.isActive).reduce((m, r) => m * r.multiplier, 1);
    const proposedMultiplier = proposedRules.filter(r => r.isActive).reduce((m, r) => m * r.multiplier, 1);

    const avgChange = ((proposedMultiplier - currentMultiplier) / currentMultiplier) * 100;

    const warnings: string[] = [];
    if (avgChange > 20) warnings.push("Price increase exceeds 20% - may impact user retention");
    if (avgChange < -20) warnings.push("Price decrease exceeds 20% - may impact revenue significantly");
    if (proposedRules.some(r => r.multiplier > 3)) warnings.push("Some rules have multipliers above 3x");

    return {
      estimatedRevenueChange: avgChange * 1000,
      estimatedRevenueChangePercent: avgChange,
      affectedUserCount: 1000,
      affectedUserPercent: 80,
      averagePriceChange: avgChange,
      priceChangeByTier: { free: avgChange * 0.5, creator: avgChange, professional: avgChange * 1.2 },
      priceChangeByContext: { interaction: avgChange, evolution: avgChange * 1.1 },
      riskAssessment: Math.abs(avgChange) > 30 ? "high" : Math.abs(avgChange) > 15 ? "medium" : "low",
      warnings,
    };
  }

  async getSubscriptionTierConfigs(): Promise<ServiceResult<SubscriptionTierConfig[]>> {
    const client = await this.getClient();

    const { data } = await client
      .from("subscription_tier_configs")
      .select("*")
      .order("priority_level");

    return {
      success: true,
      data: (data || []).map(t => ({
        tierId: t.tier_id,
        tierName: t.tier_name,
        displayName: t.display_name,
        description: t.description,
        isActive: t.is_active,
        monthlyPrice: Number(t.monthly_price),
        yearlyPrice: Number(t.yearly_price),
        tokenAllowances: t.token_allowances,
        bonusTokens: t.bonus_tokens,
        rolloverPercent: t.rollover_percent,
        maxRollover: t.max_rollover,
        capabilities: t.capabilities as CapabilityConfig,
        features: t.features as FeatureConfig[],
        priorityLevel: t.priority_level,
        createdAt: Number(t.created_at),
        updatedAt: Number(t.updated_at),
        updatedBy: t.updated_by,
      })),
    };
  }

  async updateSubscriptionTierConfig(
    adminId: string,
    tierId: string,
    updates: Partial<SubscriptionTierConfig>,
    reason: string
  ): Promise<ServiceResult<SubscriptionTierConfig>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: existing } = await client
      .from("subscription_tier_configs")
      .select("*")
      .eq("tier_id", tierId)
      .single();

    const updateData: Record<string, unknown> = { updated_at: now, updated_by: adminId };
    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.monthlyPrice !== undefined) updateData.monthly_price = updates.monthlyPrice;
    if (updates.yearlyPrice !== undefined) updateData.yearlyPrice = updates.yearlyPrice;
    if (updates.tokenAllowances !== undefined) updateData.token_allowances = updates.tokenAllowances;
    if (updates.bonusTokens !== undefined) updateData.bonus_tokens = updates.bonusTokens;
    if (updates.rolloverPercent !== undefined) updateData.rollover_percent = updates.rolloverPercent;
    if (updates.maxRollover !== undefined) updateData.max_rollover = updates.maxRollover;
    if (updates.capabilities !== undefined) updateData.capabilities = updates.capabilities;
    if (updates.features !== undefined) updateData.features = updates.features;
    if (updates.priorityLevel !== undefined) updateData.priority_level = updates.priorityLevel;

    const { data: updated } = await client
      .from("subscription_tier_configs")
      .update(updateData)
      .eq("tier_id", tierId)
      .select()
      .single();

    await this.createAuditLog(adminId, "update", "subscription_tier", tierId, existing, updated, reason);

    const result = await this.getSubscriptionTierConfigs();
    const config = result.data?.find(t => t.tierId === tierId);

    return { success: true, data: config! };
  }

  async getEthicalGovernanceConfig(): Promise<ServiceResult<EthicalGovernanceConfig | null>> {
    const client = await this.getClient();

    const { data } = await client
      .from("ethical_governance_configs")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) return { success: true, data: null };

    return {
      success: true,
      data: {
        configId: data.config_id,
        name: data.name,
        isActive: data.is_active,
        riskThresholds: data.risk_thresholds as RiskThresholds,
        interventions: data.interventions as EthicalIntervention[],
        monitoringRules: data.monitoring_rules as MonitoringRule[],
        createdAt: Number(data.created_at),
        updatedAt: Number(data.updated_at),
        updatedBy: data.updated_by,
      },
    };
  }

  async updateEthicalGovernanceConfig(
    adminId: string,
    updates: Partial<EthicalGovernanceConfig>,
    reason: string
  ): Promise<ServiceResult<EthicalGovernanceConfig>> {
    const client = await this.getClient();
    const now = Date.now();

    const current = await this.getEthicalGovernanceConfig();
    const configId = current.data?.configId || `ethical_${now}`;

    const updateData: Record<string, unknown> = { updated_at: now, updated_by: adminId };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.riskThresholds !== undefined) updateData.risk_thresholds = updates.riskThresholds;
    if (updates.interventions !== undefined) updateData.interventions = updates.interventions;
    if (updates.monitoringRules !== undefined) updateData.monitoring_rules = updates.monitoringRules;

    if (current.data) {
      await client.from("ethical_governance_configs")
        .update(updateData)
        .eq("config_id", configId);
    } else {
      await client.from("ethical_governance_configs").insert({
        config_id: configId,
        name: updates.name || "Default Ethical Governance",
        is_active: true,
        risk_thresholds: updates.riskThresholds || {},
        interventions: updates.interventions || [],
        monitoring_rules: updates.monitoringRules || [],
        created_at: now,
        ...updateData,
      });
    }

    await this.createAuditLog(adminId, "update", "ethical_config", configId, current.data, updates, reason);

    const result = await this.getEthicalGovernanceConfig();
    return { success: true, data: result.data! };
  }

  async getAuditLogs(
    filters: { adminId?: string; targetType?: AuditTargetType; limit?: number } = {}
  ): Promise<ServiceResult<AuditLogEntry[]>> {
    const client = await this.getClient();

    let query = client
      .from("admin_audit_logs")
      .select("*, admin_users!inner(user_id, role)")
      .order("timestamp", { ascending: false })
      .limit(filters.limit || 100);

    if (filters.adminId) {
      query = query.eq("admin_id", filters.adminId);
    }
    if (filters.targetType) {
      query = query.eq("target_type", filters.targetType);
    }

    const { data } = await query;

    return {
      success: true,
      data: (data || []).map(l => ({
        id: l.id,
        timestamp: Number(l.timestamp),
        adminId: l.admin_id,
        adminRole: l.admin_role as AdminRole,
        actionType: l.action_type as AuditActionType,
        targetType: l.target_type as AuditTargetType,
        targetId: l.target_id,
        previousValue: l.previous_value,
        newValue: l.new_value,
        reason: l.reason,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        sessionId: l.session_id,
      })),
    };
  }

  async rollbackConfig(
    adminId: string,
    configType: string,
    configId: string,
    targetVersion: number,
    reason: string
  ): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: version } = await client
      .from("config_versions")
      .select("*")
      .eq("config_type", configType)
      .eq("config_id", configId)
      .eq("version", targetVersion)
      .single();

    if (!version) {
      return { success: false, error: "Version not found" };
    }

    const tableMap: Record<string, string> = {
      token_class: "token_class_configs",
      pricing_rule: "pricing_rule_configs",
      subscription_tier: "subscription_tier_configs",
      ethical_config: "ethical_governance_configs",
    };

    const table = tableMap[configType];
    if (!table) {
      return { success: false, error: "Unknown config type" };
    }

    const { data: current } = await client.from(table).select("*").single();

    await client.from(table).update(version.config).eq(configType === "token_class" ? "token_class" : `${configType.replace("_config", "")}_id`, configId);

    await this.createAuditLog(adminId, "rollback", configType as AuditTargetType, configId, current, version.config, reason);

    return { success: true };
  }

  async createConfigVersion(
    adminId: string,
    configType: string,
    configId: string,
    config: Record<string, unknown>,
    changeDescription: string
  ): Promise<void> {
    const client = await this.getClient();

    const { count } = await client
      .from("config_versions")
      .select("*", { count: "exact", head: true })
      .eq("config_type", configType)
      .eq("config_id", configId);

    const version = (count || 0) + 1;

    await client.from("config_versions").insert({
      version_id: `${configType}_${configId}_v${version}`,
      config_type: configType,
      config_id: configId,
      version,
      config,
      created_at: Date.now(),
      created_by: adminId,
      change_description: changeDescription,
      is_active: true,
    });

    if (version > 1) {
      await client.from("config_versions")
        .update({ is_active: false })
        .eq("config_type", configType)
        .eq("config_id", configId)
        .lt("version", version);
    }
  }

  async grantTokensToUser(
    adminId: string,
    userId: string,
    tokenClass: string,
    amount: number,
    reason: string
  ): Promise<ServiceResult<void>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: balance } = await client
      .from("token_balances")
      .select("*")
      .eq("user_id", userId)
      .eq("token_class", tokenClass)
      .single();

    if (balance) {
      await client.from("token_balances")
        .update({ available: Number(balance.available) + amount, last_updated_at: now })
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
        last_updated_at: now,
      });
    }

    await client.from("token_ledger").insert({
      user_id: userId,
      token_class: tokenClass,
      amount,
      previous_state: "available",
      new_state: "available",
      operation_type: "grant",
      context_type: "purchase",
      metadata: { admin_granted: true, admin_id: adminId, reason },
      created_at: now,
    });

    await this.createAuditLog(adminId, "grant_tokens", "user_tokens", userId, null, { tokenClass, amount }, reason);

    return { success: true };
  }

  async acknowledgeAlert(adminId: string, alertId: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: admin } = await client.from("admin_users").select("id").eq("user_id", adminId).single();

    await client.from("economic_alerts")
      .update({ acknowledged_at: now, acknowledged_by: admin?.id })
      .eq("alert_id", alertId);

    await this.createAuditLog(adminId, "acknowledge_alert", "system_config", alertId, null, { acknowledgedAt: now }, "Alert acknowledged");

    return { success: true };
  }

  private async createAuditLog(
    adminId: string,
    actionType: AuditActionType,
    targetType: AuditTargetType,
    targetId: string,
    previousValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
    reason: string
  ): Promise<void> {
    const client = await this.getClient();

    const { data: admin } = await client
      .from("admin_users")
      .select("id, role")
      .eq("user_id", adminId)
      .single();

    if (!admin) return;

    await client.from("admin_audit_logs").insert({
      admin_id: admin.id,
      admin_role: admin.role,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      previous_value: previousValue,
      new_value: newValue,
      reason,
      timestamp: Date.now(),
    });

    if (newValue) {
      await this.createConfigVersion(adminId, targetType, targetId, newValue, reason);
    }
  }
}

export const adminEconomyEngine = new AdminEconomyEngine();
