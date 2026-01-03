export type AdminRole = "super_admin" | "economic_admin" | "analyst";

export interface AdminUser {
  id: string;
  userId: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  createdAt: number;
  lastAccessAt: number;
  createdBy: string;
}

export type AdminPermission =
  | "view_economic_overview"
  | "view_token_analytics"
  | "view_subscription_analytics"
  | "view_ethical_governance"
  | "manage_token_classes"
  | "manage_token_rules"
  | "manage_pricing_rules"
  | "manage_subscriptions"
  | "manage_capabilities"
  | "manage_ethical_thresholds"
  | "execute_token_operations"
  | "simulate_economic_changes"
  | "apply_economic_changes"
  | "rollback_changes"
  | "manage_admins"
  | "view_audit_logs"
  | "export_data";

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    "view_economic_overview",
    "view_token_analytics",
    "view_subscription_analytics",
    "view_ethical_governance",
    "manage_token_classes",
    "manage_token_rules",
    "manage_pricing_rules",
    "manage_subscriptions",
    "manage_capabilities",
    "manage_ethical_thresholds",
    "execute_token_operations",
    "simulate_economic_changes",
    "apply_economic_changes",
    "rollback_changes",
    "manage_admins",
    "view_audit_logs",
    "export_data",
  ],
  economic_admin: [
    "view_economic_overview",
    "view_token_analytics",
    "view_subscription_analytics",
    "view_ethical_governance",
    "manage_token_classes",
    "manage_token_rules",
    "manage_pricing_rules",
    "manage_subscriptions",
    "manage_capabilities",
    "manage_ethical_thresholds",
    "execute_token_operations",
    "simulate_economic_changes",
    "apply_economic_changes",
    "view_audit_logs",
  ],
  analyst: [
    "view_economic_overview",
    "view_token_analytics",
    "view_subscription_analytics",
    "view_ethical_governance",
    "view_audit_logs",
    "export_data",
  ],
};

export interface EconomicOverview {
  timestamp: number;
  tokenMetrics: TokenMetrics;
  subscriptionMetrics: SubscriptionMetrics;
  revenueMetrics: RevenueMetrics;
  systemMetrics: SystemMetrics;
  alerts: EconomicAlert[];
}

export interface TokenMetrics {
  totalTokensInCirculation: Record<string, number>;
  tokensConsumedToday: Record<string, number>;
  tokensConsumedThisWeek: Record<string, number>;
  tokensConsumedThisMonth: Record<string, number>;
  tokensBurned: Record<string, number>;
  tokensLocked: Record<string, number>;
  tokensStaked: Record<string, number>;
  tokensDecayed: Record<string, number>;
  consumptionTrend: TrendData[];
  topConsumptionContexts: ContextConsumption[];
}

export interface TrendData {
  timestamp: number;
  value: number;
  label: string;
}

export interface ContextConsumption {
  contextType: string;
  totalConsumed: number;
  percentage: number;
  averagePerOperation: number;
}

export interface SubscriptionMetrics {
  totalSubscribers: number;
  subscribersByTier: Record<string, number>;
  newSubscribersThisMonth: number;
  churnedThisMonth: number;
  churnRate: number;
  upgradeRate: number;
  downgradeRate: number;
  trialConversionRate: number;
  averageLifetimeValue: number;
  monthlyRecurringRevenue: number;
}

export interface RevenueMetrics {
  totalRevenueToday: number;
  totalRevenueThisWeek: number;
  totalRevenueThisMonth: number;
  subscriptionRevenue: number;
  tokenPurchaseRevenue: number;
  amplifierRevenue: number;
  revenueByTier: Record<string, number>;
  revenueTrend: TrendData[];
  averageRevenuePerUser: number;
}

export interface SystemMetrics {
  currentLoad: number;
  loadTrend: TrendData[];
  averageResponseTime: number;
  activeUsers: number;
  concurrentSessions: number;
  queueDepth: number;
  errorRate: number;
  computeUtilization: number;
}

export interface EconomicAlert {
  alertId: string;
  severity: "info" | "warning" | "critical";
  category: AlertCategory;
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  triggeredAt: number;
  acknowledgedAt: number | null;
  acknowledgedBy: string | null;
}

export type AlertCategory =
  | "token_depletion"
  | "unusual_consumption"
  | "system_load"
  | "revenue_anomaly"
  | "ethical_risk"
  | "subscription_churn"
  | "pricing_impact";

export interface TokenClassConfig {
  tokenClass: string;
  displayName: string;
  description: string;
  isActive: boolean;
  burnRate: number;
  decayEnabled: boolean;
  decayRatePerDay: number;
  decayGracePeriodDays: number;
  minBalance: number;
  maxBalance: number;
  stakingEnabled: boolean;
  stakingBonusRate: number;
  transferable: boolean;
  purchasable: boolean;
  abusePreventionLimits: AbusePreventionLimits;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export interface AbusePreventionLimits {
  maxConsumptionPerHour: number;
  maxConsumptionPerDay: number;
  maxConsumptionPerWeek: number;
  burstLimit: number;
  burstWindowMs: number;
  cooldownAfterBurstMs: number;
  suspiciousPatternThreshold: number;
}

export interface PricingRuleConfig {
  ruleId: string;
  ruleName: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: PricingCondition[];
  multiplier: number;
  flatAdjustment: number;
  appliesTo: string[];
  validFrom: number | null;
  validUntil: number | null;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export interface PricingCondition {
  conditionType: PricingConditionType;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "between";
  value: number | string | number[] | string[];
}

export type PricingConditionType =
  | "time_of_day"
  | "day_of_week"
  | "system_load"
  | "user_tier"
  | "interaction_depth"
  | "emotional_intensity"
  | "ethical_risk"
  | "region"
  | "user_tenure"
  | "usage_frequency";

export interface PricingSimulation {
  simulationId: string;
  name: string;
  description: string;
  status: "draft" | "running" | "completed" | "cancelled";
  originalConfig: PricingRuleConfig[];
  proposedConfig: PricingRuleConfig[];
  impactAnalysis: PricingImpactAnalysis | null;
  createdAt: number;
  createdBy: string;
  completedAt: number | null;
}

export interface PricingImpactAnalysis {
  estimatedRevenueChange: number;
  estimatedRevenueChangePercent: number;
  affectedUserCount: number;
  affectedUserPercent: number;
  averagePriceChange: number;
  priceChangeByTier: Record<string, number>;
  priceChangeByContext: Record<string, number>;
  riskAssessment: "low" | "medium" | "high";
  warnings: string[];
}

export interface SubscriptionTierConfig {
  tierId: string;
  tierName: string;
  displayName: string;
  description: string;
  isActive: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  tokenAllowances: Record<string, number>;
  bonusTokens: Record<string, number>;
  rolloverPercent: number;
  maxRollover: number;
  capabilities: CapabilityConfig;
  features: FeatureConfig[];
  priorityLevel: number;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export interface CapabilityConfig {
  maxCognitiveDepth: number;
  maxSimulationComplexity: string;
  maxEvolutionSpeed: string;
  maxActiveCharacters: number;
  maxMemoriesPerCharacter: number;
  maxVersionsPerCharacter: number;
  processingPriority: string;
  apiRateLimit: number;
  concurrentSessions: number;
}

export interface FeatureConfig {
  featureId: string;
  name: string;
  description: string;
  included: boolean;
  limit: number | null;
}

export interface EthicalGovernanceConfig {
  configId: string;
  name: string;
  isActive: boolean;
  riskThresholds: RiskThresholds;
  interventions: EthicalIntervention[];
  monitoringRules: MonitoringRule[];
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export interface RiskThresholds {
  elevatedThreshold: number;
  concerningThreshold: number;
  criticalThreshold: number;
  maxDailyInteractions: number;
  maxSessionLength: number;
  minBreakBetweenSessions: number;
  emotionalIntensityThreshold: number;
}

export interface EthicalIntervention {
  interventionId: string;
  riskLevel: string;
  interventionType: EthicalInterventionType;
  parameters: Record<string, unknown>;
  priority: number;
  isActive: boolean;
}

export type EthicalInterventionType =
  | "price_increase"
  | "depth_reduction"
  | "cooldown_enforcement"
  | "break_incentive"
  | "notification"
  | "session_limit"
  | "account_flag"
  | "manual_review";

export interface MonitoringRule {
  ruleId: string;
  ruleName: string;
  pattern: string;
  threshold: number;
  action: string;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  adminId: string;
  adminRole: AdminRole;
  actionType: AuditActionType;
  targetType: AuditTargetType;
  targetId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export type AuditActionType =
  | "create"
  | "update"
  | "delete"
  | "activate"
  | "deactivate"
  | "simulate"
  | "apply"
  | "rollback"
  | "grant_tokens"
  | "revoke_tokens"
  | "override"
  | "acknowledge_alert"
  | "export";

export type AuditTargetType =
  | "token_class"
  | "pricing_rule"
  | "subscription_tier"
  | "capability"
  | "ethical_config"
  | "user_tokens"
  | "user_subscription"
  | "admin_user"
  | "system_config";

export interface ConfigVersion {
  versionId: string;
  configType: string;
  configId: string;
  version: number;
  config: Record<string, unknown>;
  createdAt: number;
  createdBy: string;
  changeDescription: string;
  isActive: boolean;
}

export interface EconomicSimulationMode {
  isEnabled: boolean;
  simulationId: string;
  startedAt: number;
  startedBy: string;
  description: string;
  affectedConfigs: string[];
  sandboxTokenPool: Record<string, number>;
}

export interface AdminDashboardState {
  overview: EconomicOverview | null;
  tokenConfigs: TokenClassConfig[];
  pricingRules: PricingRuleConfig[];
  subscriptionTiers: SubscriptionTierConfig[];
  ethicalConfig: EthicalGovernanceConfig | null;
  recentAuditLogs: AuditLogEntry[];
  activeSimulation: EconomicSimulationMode | null;
  alerts: EconomicAlert[];
  isLoading: boolean;
  lastRefreshed: number;
}

export const ADMIN_ROLE_DISPLAY: Record<AdminRole, { name: string; description: string; color: string }> = {
  super_admin: {
    name: "Super Admin",
    description: "Full system access with all permissions",
    color: "oklch(0.7 0.2 350)",
  },
  economic_admin: {
    name: "Economic Admin",
    description: "Manage economic systems and configurations",
    color: "oklch(0.7 0.18 280)",
  },
  analyst: {
    name: "Analyst",
    description: "View-only access to analytics and reports",
    color: "oklch(0.7 0.15 200)",
  },
};

export const ALERT_SEVERITY_CONFIG: Record<string, { color: string; icon: string }> = {
  info: { color: "oklch(0.7 0.15 200)", icon: "Info" },
  warning: { color: "oklch(0.75 0.18 80)", icon: "AlertTriangle" },
  critical: { color: "oklch(0.65 0.2 25)", icon: "AlertCircle" },
};
