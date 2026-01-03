import type { IllusionRiskLevel } from "./ethical-guardrails";

export type TokenClass =
  | "core_interaction"
  | "cognitive_depth"
  | "evolution"
  | "creation_fork"
  | "compute_priority"
  | "memory_preservation"
  | "voice_avatar"
  | "stabilization";

export type TokenState = "available" | "consumed" | "locked" | "staked" | "decayed" | "amplified";

export interface TokenBalance {
  userId: string;
  tokenClass: TokenClass;
  available: number;
  locked: number;
  staked: number;
  pendingDecay: number;
  amplifiedBonus: number;
  lastUpdatedAt: number;
}

export interface TokenLedgerEntry {
  id: string;
  userId: string;
  tokenClass: TokenClass;
  amount: number;
  previousState: TokenState;
  newState: TokenState;
  operationType: TokenOperationType;
  contextId: string | null;
  contextType: TokenContextType | null;
  pricingFactors: PricingFactors | null;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export type TokenOperationType =
  | "consume"
  | "grant"
  | "purchase"
  | "refund"
  | "lock"
  | "unlock"
  | "stake"
  | "unstake"
  | "decay"
  | "amplify"
  | "transfer"
  | "subscription_grant"
  | "bonus";

export type TokenContextType =
  | "interaction"
  | "character_creation"
  | "character_fork"
  | "evolution_event"
  | "simulation"
  | "memory_operation"
  | "voice_generation"
  | "avatar_generation"
  | "stabilization"
  | "compute_boost"
  | "subscription"
  | "purchase";

export interface PricingFactors {
  basePrice: number;
  interactionDepthMultiplier: number;
  emotionalIntensityMultiplier: number;
  simulationLayerMultiplier: number;
  stateComplexityMultiplier: number;
  systemLoadMultiplier: number;
  ethicalRiskMultiplier: number;
  subscriptionDiscount: number;
  finalPrice: number;
  breakdown: PricingBreakdown;
}

export interface PricingBreakdown {
  baseCost: number;
  depthCost: number;
  emotionalCost: number;
  simulationCost: number;
  complexityCost: number;
  loadSurcharge: number;
  ethicalAdjustment: number;
  discountApplied: number;
}

export interface DynamicPricingConfig {
  basePrices: Record<TokenContextType, number>;
  depthMultipliers: DepthMultiplierConfig;
  emotionalMultipliers: EmotionalMultiplierConfig;
  simulationMultipliers: SimulationMultiplierConfig;
  loadMultipliers: LoadMultiplierConfig;
  ethicalMultipliers: EthicalMultiplierConfig;
  decayConfig: TokenDecayConfig;
  amplificationConfig: TokenAmplificationConfig;
}

export interface DepthMultiplierConfig {
  shallow: number;
  moderate: number;
  deep: number;
  profound: number;
  thresholds: { moderate: number; deep: number; profound: number };
}

export interface EmotionalMultiplierConfig {
  low: number;
  medium: number;
  high: number;
  intense: number;
  thresholds: { medium: number; high: number; intense: number };
}

export interface SimulationMultiplierConfig {
  none: number;
  basic: number;
  standard: number;
  advanced: number;
  full: number;
}

export interface LoadMultiplierConfig {
  low: number;
  normal: number;
  high: number;
  critical: number;
  thresholds: { normal: number; high: number; critical: number };
}

export interface EthicalMultiplierConfig {
  healthy: number;
  elevated: number;
  concerning: number;
  critical: number;
}

export interface TokenDecayConfig {
  enableDecay: boolean;
  decayRatePerDay: number;
  graceperiodDays: number;
  minimumBalance: number;
  exemptClasses: TokenClass[];
}

export interface TokenAmplificationConfig {
  enableAmplification: boolean;
  stakingBonusRate: number;
  streakBonusRate: number;
  maxAmplification: number;
}

export const DEFAULT_DYNAMIC_PRICING_CONFIG: DynamicPricingConfig = {
  basePrices: {
    interaction: 1,
    character_creation: 50,
    character_fork: 30,
    evolution_event: 5,
    simulation: 10,
    memory_operation: 2,
    voice_generation: 15,
    avatar_generation: 20,
    stabilization: 25,
    compute_boost: 10,
    subscription: 0,
    purchase: 0,
  },
  depthMultipliers: {
    shallow: 1.0,
    moderate: 1.5,
    deep: 2.5,
    profound: 4.0,
    thresholds: { moderate: 30, deep: 60, profound: 85 },
  },
  emotionalMultipliers: {
    low: 1.0,
    medium: 1.3,
    high: 1.8,
    intense: 2.5,
    thresholds: { medium: 40, high: 70, intense: 90 },
  },
  simulationMultipliers: {
    none: 1.0,
    basic: 1.2,
    standard: 1.5,
    advanced: 2.0,
    full: 3.0,
  },
  loadMultipliers: {
    low: 0.9,
    normal: 1.0,
    high: 1.3,
    critical: 2.0,
    thresholds: { normal: 50, high: 75, critical: 90 },
  },
  ethicalMultipliers: {
    healthy: 1.0,
    elevated: 1.5,
    concerning: 3.0,
    critical: 10.0,
  },
  decayConfig: {
    enableDecay: true,
    decayRatePerDay: 0.01,
    graceperiodDays: 30,
    minimumBalance: 10,
    exemptClasses: ["creation_fork", "voice_avatar"],
  },
  amplificationConfig: {
    enableAmplification: true,
    stakingBonusRate: 0.05,
    streakBonusRate: 0.02,
    maxAmplification: 2.0,
  },
};

export type SubscriptionTier = "free" | "creator" | "professional" | "enterprise";

export interface SubscriptionCapabilities {
  tier: SubscriptionTier;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  tokenGrant: TokenGrant;
  capabilityLimits: CapabilityLimits;
  features: SubscriptionFeature[];
  priorityLevel: number;
}

export interface TokenGrant {
  monthly: Record<TokenClass, number>;
  bonus: Record<TokenClass, number>;
  rolloverPercent: number;
  maxRollover: number;
}

export interface CapabilityLimits {
  maxCognitiveDepth: number;
  maxSimulationComplexity: SimulationComplexityLevel;
  maxEvolutionSpeed: EvolutionSpeedLevel;
  maxActiveCharacters: number;
  maxMemoriesPerCharacter: number;
  maxVersionsPerCharacter: number;
  processingPriority: ProcessingPriorityLevel;
  apiRateLimit: number;
  concurrentSessions: number;
}

export type SimulationComplexityLevel = "basic" | "standard" | "advanced" | "full";
export type EvolutionSpeedLevel = "natural" | "accelerated" | "rapid" | "instant";
export type ProcessingPriorityLevel = "standard" | "elevated" | "high" | "realtime";

export interface SubscriptionFeature {
  featureId: string;
  name: string;
  description: string;
  included: boolean;
  limit?: number;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionCapabilities> = {
  free: {
    tier: "free",
    displayName: "Explorer",
    description: "Perfect for trying out the platform",
    monthlyPrice: 0,
    yearlyPrice: 0,
    tokenGrant: {
      monthly: {
        core_interaction: 100,
        cognitive_depth: 20,
        evolution: 5,
        creation_fork: 2,
        compute_priority: 0,
        memory_preservation: 5,
        voice_avatar: 0,
        stabilization: 0,
      },
      bonus: {
        core_interaction: 0,
        cognitive_depth: 0,
        evolution: 0,
        creation_fork: 0,
        compute_priority: 0,
        memory_preservation: 0,
        voice_avatar: 0,
        stabilization: 0,
      },
      rolloverPercent: 0,
      maxRollover: 0,
    },
    capabilityLimits: {
      maxCognitiveDepth: 50,
      maxSimulationComplexity: "basic",
      maxEvolutionSpeed: "natural",
      maxActiveCharacters: 2,
      maxMemoriesPerCharacter: 50,
      maxVersionsPerCharacter: 5,
      processingPriority: "standard",
      apiRateLimit: 60,
      concurrentSessions: 1,
    },
    features: [
      { featureId: "basic_chat", name: "Basic Chat", description: "Standard conversation capabilities", included: true },
      { featureId: "character_creation", name: "Character Creation", description: "Create new characters", included: true, limit: 2 },
      { featureId: "trait_editing", name: "Trait Editing", description: "Modify character traits", included: true },
    ],
    priorityLevel: 0,
  },
  creator: {
    tier: "creator",
    displayName: "Creator",
    description: "For serious character builders",
    monthlyPrice: 19,
    yearlyPrice: 190,
    tokenGrant: {
      monthly: {
        core_interaction: 500,
        cognitive_depth: 100,
        evolution: 30,
        creation_fork: 10,
        compute_priority: 20,
        memory_preservation: 30,
        voice_avatar: 5,
        stabilization: 10,
      },
      bonus: {
        core_interaction: 50,
        cognitive_depth: 10,
        evolution: 5,
        creation_fork: 2,
        compute_priority: 0,
        memory_preservation: 5,
        voice_avatar: 0,
        stabilization: 0,
      },
      rolloverPercent: 20,
      maxRollover: 200,
    },
    capabilityLimits: {
      maxCognitiveDepth: 75,
      maxSimulationComplexity: "standard",
      maxEvolutionSpeed: "accelerated",
      maxActiveCharacters: 10,
      maxMemoriesPerCharacter: 200,
      maxVersionsPerCharacter: 20,
      processingPriority: "elevated",
      apiRateLimit: 300,
      concurrentSessions: 3,
    },
    features: [
      { featureId: "basic_chat", name: "Enhanced Chat", description: "Deeper conversation capabilities", included: true },
      { featureId: "character_creation", name: "Character Creation", description: "Create new characters", included: true, limit: 10 },
      { featureId: "trait_editing", name: "Advanced Traits", description: "Full trait customization", included: true },
      { featureId: "evolution", name: "Accelerated Evolution", description: "Faster character development", included: true },
      { featureId: "simulation", name: "Simulation Lab", description: "Test character behaviors", included: true },
      { featureId: "voice_preview", name: "Voice Preview", description: "Preview voice options", included: true, limit: 5 },
    ],
    priorityLevel: 1,
  },
  professional: {
    tier: "professional",
    displayName: "Professional",
    description: "Full creative control",
    monthlyPrice: 49,
    yearlyPrice: 490,
    tokenGrant: {
      monthly: {
        core_interaction: 2000,
        cognitive_depth: 400,
        evolution: 100,
        creation_fork: 30,
        compute_priority: 100,
        memory_preservation: 100,
        voice_avatar: 20,
        stabilization: 30,
      },
      bonus: {
        core_interaction: 200,
        cognitive_depth: 50,
        evolution: 20,
        creation_fork: 5,
        compute_priority: 20,
        memory_preservation: 20,
        voice_avatar: 5,
        stabilization: 5,
      },
      rolloverPercent: 40,
      maxRollover: 1000,
    },
    capabilityLimits: {
      maxCognitiveDepth: 90,
      maxSimulationComplexity: "advanced",
      maxEvolutionSpeed: "rapid",
      maxActiveCharacters: 50,
      maxMemoriesPerCharacter: 1000,
      maxVersionsPerCharacter: 100,
      processingPriority: "high",
      apiRateLimit: 1000,
      concurrentSessions: 10,
    },
    features: [
      { featureId: "basic_chat", name: "Premium Chat", description: "Maximum depth conversations", included: true },
      { featureId: "character_creation", name: "Unlimited Characters", description: "Create unlimited characters", included: true },
      { featureId: "trait_editing", name: "DNA Studio", description: "Complete DNA control", included: true },
      { featureId: "evolution", name: "Rapid Evolution", description: "Accelerated development", included: true },
      { featureId: "simulation", name: "Advanced Simulation", description: "Complex scenario testing", included: true },
      { featureId: "voice", name: "Voice Generation", description: "Custom voice synthesis", included: true },
      { featureId: "avatar", name: "Avatar Generation", description: "Visual character creation", included: true },
      { featureId: "forking", name: "Character Forking", description: "Create character variations", included: true },
      { featureId: "api_access", name: "API Access", description: "Programmatic integration", included: true },
    ],
    priorityLevel: 2,
  },
  enterprise: {
    tier: "enterprise",
    displayName: "Enterprise",
    description: "For teams and organizations",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    tokenGrant: {
      monthly: {
        core_interaction: 10000,
        cognitive_depth: 2000,
        evolution: 500,
        creation_fork: 100,
        compute_priority: 500,
        memory_preservation: 500,
        voice_avatar: 100,
        stabilization: 100,
      },
      bonus: {
        core_interaction: 1000,
        cognitive_depth: 200,
        evolution: 100,
        creation_fork: 20,
        compute_priority: 100,
        memory_preservation: 50,
        voice_avatar: 20,
        stabilization: 20,
      },
      rolloverPercent: 60,
      maxRollover: 5000,
    },
    capabilityLimits: {
      maxCognitiveDepth: 100,
      maxSimulationComplexity: "full",
      maxEvolutionSpeed: "instant",
      maxActiveCharacters: -1,
      maxMemoriesPerCharacter: -1,
      maxVersionsPerCharacter: -1,
      processingPriority: "realtime",
      apiRateLimit: 10000,
      concurrentSessions: -1,
    },
    features: [
      { featureId: "everything", name: "Everything in Professional", description: "All professional features", included: true },
      { featureId: "team", name: "Team Management", description: "Multi-user collaboration", included: true },
      { featureId: "sso", name: "SSO Integration", description: "Enterprise authentication", included: true },
      { featureId: "dedicated", name: "Dedicated Support", description: "Priority support channel", included: true },
      { featureId: "sla", name: "SLA Guarantee", description: "99.9% uptime guarantee", included: true },
      { featureId: "custom", name: "Custom Integration", description: "Bespoke solutions", included: true },
    ],
    priorityLevel: 3,
  },
};

export type ValueAmplifierType =
  | "evolution_acceleration"
  | "personality_stabilization"
  | "memory_preservation"
  | "character_versioning"
  | "voice_continuity"
  | "avatar_continuity"
  | "priority_processing"
  | "extended_context";

export interface ValueAmplifier {
  amplifierId: string;
  amplifierType: ValueAmplifierType;
  displayName: string;
  description: string;
  tokenClass: TokenClass;
  tokenCost: number;
  duration: number | null;
  effect: AmplifierEffect;
  stackable: boolean;
  maxStacks: number;
}

export interface AmplifierEffect {
  effectType: AmplifierEffectType;
  magnitude: number;
  targetSystem: string;
  parameters: Record<string, unknown>;
}

export type AmplifierEffectType =
  | "speed_multiplier"
  | "protection_shield"
  | "capacity_increase"
  | "quality_boost"
  | "priority_elevation"
  | "duration_extension";

export const VALUE_AMPLIFIERS: ValueAmplifier[] = [
  {
    amplifierId: "evo_accel_2x",
    amplifierType: "evolution_acceleration",
    displayName: "Evolution Boost 2x",
    description: "Double the speed of personality evolution for 24 hours",
    tokenClass: "evolution",
    tokenCost: 20,
    duration: 86400000,
    effect: {
      effectType: "speed_multiplier",
      magnitude: 2.0,
      targetSystem: "evolution",
      parameters: { minEvolutionInterval: 0.5 },
    },
    stackable: false,
    maxStacks: 1,
  },
  {
    amplifierId: "evo_accel_5x",
    amplifierType: "evolution_acceleration",
    displayName: "Evolution Surge 5x",
    description: "5x evolution speed for 12 hours - intensive development",
    tokenClass: "evolution",
    tokenCost: 50,
    duration: 43200000,
    effect: {
      effectType: "speed_multiplier",
      magnitude: 5.0,
      targetSystem: "evolution",
      parameters: { minEvolutionInterval: 0.2 },
    },
    stackable: false,
    maxStacks: 1,
  },
  {
    amplifierId: "personality_shield",
    amplifierType: "personality_stabilization",
    displayName: "Personality Shield",
    description: "Protect current personality from drift for 7 days",
    tokenClass: "stabilization",
    tokenCost: 30,
    duration: 604800000,
    effect: {
      effectType: "protection_shield",
      magnitude: 0.9,
      targetSystem: "personality",
      parameters: { maxDriftAllowed: 0.1 },
    },
    stackable: false,
    maxStacks: 1,
  },
  {
    amplifierId: "core_lock",
    amplifierType: "personality_stabilization",
    displayName: "Core Lock",
    description: "Permanently crystallize core personality traits",
    tokenClass: "stabilization",
    tokenCost: 100,
    duration: null,
    effect: {
      effectType: "protection_shield",
      magnitude: 1.0,
      targetSystem: "core_traits",
      parameters: { permanent: true, traitsProtected: 5 },
    },
    stackable: false,
    maxStacks: 1,
  },
  {
    amplifierId: "memory_vault",
    amplifierType: "memory_preservation",
    displayName: "Memory Vault",
    description: "Preserve 100 additional memories permanently",
    tokenClass: "memory_preservation",
    tokenCost: 25,
    duration: null,
    effect: {
      effectType: "capacity_increase",
      magnitude: 100,
      targetSystem: "memory",
      parameters: { memoryType: "all", permanent: true },
    },
    stackable: true,
    maxStacks: 10,
  },
  {
    amplifierId: "legacy_save",
    amplifierType: "character_versioning",
    displayName: "Legacy Save",
    description: "Create a permanent, restorable snapshot of your character",
    tokenClass: "creation_fork",
    tokenCost: 40,
    duration: null,
    effect: {
      effectType: "capacity_increase",
      magnitude: 1,
      targetSystem: "versioning",
      parameters: { snapshotType: "full", restorable: true },
    },
    stackable: true,
    maxStacks: 50,
  },
  {
    amplifierId: "voice_pack",
    amplifierType: "voice_continuity",
    displayName: "Voice Continuity Pack",
    description: "Lock in voice characteristics for consistent synthesis",
    tokenClass: "voice_avatar",
    tokenCost: 35,
    duration: null,
    effect: {
      effectType: "quality_boost",
      magnitude: 1.5,
      targetSystem: "voice",
      parameters: { voiceId: "custom", locked: true },
    },
    stackable: false,
    maxStacks: 1,
  },
  {
    amplifierId: "avatar_pack",
    amplifierType: "avatar_continuity",
    displayName: "Avatar Continuity Pack",
    description: "Lock in visual appearance for consistent generation",
    tokenClass: "voice_avatar",
    tokenCost: 40,
    duration: null,
    effect: {
      effectType: "quality_boost",
      magnitude: 1.5,
      targetSystem: "avatar",
      parameters: { avatarId: "custom", locked: true },
    },
    stackable: false,
    maxStacks: 1,
  },
  {
    amplifierId: "priority_boost",
    amplifierType: "priority_processing",
    displayName: "Priority Boost",
    description: "Skip the queue for 1 hour of real-time processing",
    tokenClass: "compute_priority",
    tokenCost: 15,
    duration: 3600000,
    effect: {
      effectType: "priority_elevation",
      magnitude: 3,
      targetSystem: "compute",
      parameters: { queuePriority: "realtime" },
    },
    stackable: false,
    maxStacks: 1,
  },
  {
    amplifierId: "extended_context",
    amplifierType: "extended_context",
    displayName: "Extended Context",
    description: "Double conversation context window for deeper interactions",
    tokenClass: "cognitive_depth",
    tokenCost: 20,
    duration: 86400000,
    effect: {
      effectType: "capacity_increase",
      magnitude: 2.0,
      targetSystem: "context",
      parameters: { contextMultiplier: 2.0 },
    },
    stackable: false,
    maxStacks: 1,
  },
];

export interface EthicalEconomicGovernance {
  userId: string;
  characterId: string;
  currentRiskLevel: IllusionRiskLevel;
  usagePattern: UsagePattern;
  economicAdjustments: EconomicAdjustment[];
  wellbeingScore: number;
  lastAssessedAt: number;
}

export interface UsagePattern {
  dailyInteractions: number;
  averageSessionLength: number;
  emotionalIntensityTrend: number;
  breakFrequency: number;
  diversityScore: number;
}

export interface EconomicAdjustment {
  adjustmentType: EconomicAdjustmentType;
  magnitude: number;
  reason: string;
  appliedAt: number;
  expiresAt: number | null;
}

export type EconomicAdjustmentType =
  | "price_increase"
  | "depth_reduction"
  | "cooldown_required"
  | "incentive_break"
  | "diversity_bonus";

export interface EthicalPricingModifier {
  riskLevel: IllusionRiskLevel;
  priceMultiplier: number;
  depthCap: number | null;
  cooldownMs: number;
  breakIncentive: number;
}

export const ETHICAL_PRICING_MODIFIERS: Record<IllusionRiskLevel, EthicalPricingModifier> = {
  healthy: {
    riskLevel: "healthy",
    priceMultiplier: 1.0,
    depthCap: null,
    cooldownMs: 0,
    breakIncentive: 0,
  },
  elevated: {
    riskLevel: "elevated",
    priceMultiplier: 1.5,
    depthCap: 80,
    cooldownMs: 300000,
    breakIncentive: 10,
  },
  concerning: {
    riskLevel: "concerning",
    priceMultiplier: 3.0,
    depthCap: 60,
    cooldownMs: 900000,
    breakIncentive: 25,
  },
  critical: {
    riskLevel: "critical",
    priceMultiplier: 10.0,
    depthCap: 30,
    cooldownMs: 3600000,
    breakIncentive: 50,
  },
};

export interface UserEconomicState {
  userId: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  tokenBalances: Map<TokenClass, TokenBalance>;
  activeAmplifiers: ActiveAmplifier[];
  economicAdjustments: EconomicAdjustment[];
  usageStreak: number;
  lastInteractionAt: number;
  createdAt: number;
}

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "paused" | "trial";

export interface ActiveAmplifier {
  amplifierId: string;
  amplifierType: ValueAmplifierType;
  activatedAt: number;
  expiresAt: number | null;
  stackCount: number;
  effect: AmplifierEffect;
}

export interface TokenPackage {
  packageId: string;
  displayName: string;
  description: string;
  tokenGrants: Record<TokenClass, number>;
  price: number;
  discount: number;
  featured: boolean;
  limitedTime: boolean;
  expiresAt: number | null;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    packageId: "starter_pack",
    displayName: "Starter Pack",
    description: "Get started with essential tokens",
    tokenGrants: {
      core_interaction: 200,
      cognitive_depth: 40,
      evolution: 10,
      creation_fork: 3,
      compute_priority: 5,
      memory_preservation: 10,
      voice_avatar: 0,
      stabilization: 0,
    },
    price: 9.99,
    discount: 0,
    featured: false,
    limitedTime: false,
    expiresAt: null,
  },
  {
    packageId: "creator_bundle",
    displayName: "Creator Bundle",
    description: "Everything you need for serious character building",
    tokenGrants: {
      core_interaction: 600,
      cognitive_depth: 120,
      evolution: 40,
      creation_fork: 10,
      compute_priority: 30,
      memory_preservation: 40,
      voice_avatar: 5,
      stabilization: 10,
    },
    price: 24.99,
    discount: 15,
    featured: true,
    limitedTime: false,
    expiresAt: null,
  },
  {
    packageId: "evolution_pack",
    displayName: "Evolution Pack",
    description: "Accelerate your character's development",
    tokenGrants: {
      core_interaction: 100,
      cognitive_depth: 50,
      evolution: 100,
      creation_fork: 5,
      compute_priority: 20,
      memory_preservation: 20,
      voice_avatar: 0,
      stabilization: 20,
    },
    price: 19.99,
    discount: 0,
    featured: false,
    limitedTime: false,
    expiresAt: null,
  },
  {
    packageId: "premium_bundle",
    displayName: "Premium Bundle",
    description: "Maximum value for power users",
    tokenGrants: {
      core_interaction: 2000,
      cognitive_depth: 400,
      evolution: 150,
      creation_fork: 30,
      compute_priority: 100,
      memory_preservation: 100,
      voice_avatar: 25,
      stabilization: 40,
    },
    price: 79.99,
    discount: 25,
    featured: true,
    limitedTime: false,
    expiresAt: null,
  },
];

export const TOKEN_CLASS_DISPLAY: Record<TokenClass, { name: string; description: string; icon: string; color: string }> = {
  core_interaction: {
    name: "Interaction Tokens",
    description: "Basic conversation and engagement",
    icon: "MessageCircle",
    color: "oklch(0.7 0.15 200)",
  },
  cognitive_depth: {
    name: "Depth Tokens",
    description: "Deeper, more nuanced interactions",
    icon: "Brain",
    color: "oklch(0.7 0.18 280)",
  },
  evolution: {
    name: "Evolution Tokens",
    description: "Character growth and development",
    icon: "TrendingUp",
    color: "oklch(0.7 0.2 150)",
  },
  creation_fork: {
    name: "Creation Tokens",
    description: "Create new characters or variations",
    icon: "Sparkles",
    color: "oklch(0.75 0.2 50)",
  },
  compute_priority: {
    name: "Priority Tokens",
    description: "Faster processing and responses",
    icon: "Zap",
    color: "oklch(0.8 0.2 80)",
  },
  memory_preservation: {
    name: "Memory Tokens",
    description: "Preserve and protect memories",
    icon: "Database",
    color: "oklch(0.65 0.15 320)",
  },
  voice_avatar: {
    name: "Voice & Avatar Tokens",
    description: "Voice synthesis and visual generation",
    icon: "Mic",
    color: "oklch(0.7 0.17 350)",
  },
  stabilization: {
    name: "Stabilization Tokens",
    description: "Protect personality from drift",
    icon: "Shield",
    color: "oklch(0.65 0.12 240)",
  },
};
