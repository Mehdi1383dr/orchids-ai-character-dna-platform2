export type SimulationStateName =
  | "energy"
  | "fatigue_cognitive"
  | "fatigue_emotional"
  | "fatigue_social"
  | "fatigue_motivational"
  | "stress"
  | "arousal"
  | "boredom"
  | "curiosity"
  | "emotional_valence"
  | "emotional_arousal"
  | "social_charge"
  | "creative_potential"
  | "focus_capacity"
  | "rest_pressure";

export interface ContinuousStateSpace {
  name: SimulationStateName;
  baseline: number;
  currentValue: number;
  deviation: number;
  recoveryPressure: number;
  stochasticVariation: number;
  stabilityBounds: StabilityBounds;
  velocity: number;
  acceleration: number;
  lastUpdatedAt: number;
}

export interface StabilityBounds {
  min: number;
  max: number;
  softMin: number;
  softMax: number;
  criticalLow: number;
  criticalHigh: number;
  elasticity: number;
  dampingFactor: number;
}

export interface HomeostasisConfig {
  targetBaseline: number;
  returnRate: number;
  resistanceThreshold: number;
  overshootDamping: number;
  activationDelay: number;
  maxCorrectionPerTick: number;
}

export interface AllostasisConfig {
  adaptationRate: number;
  persistenceThreshold: number;
  baselineShiftCap: number;
  hysteresisWindow: number;
  stressMemoryDecay: number;
  plasticityFactor: number;
  consolidationPeriod: number;
}

export interface DualRegulation {
  stateId: string;
  stateName: SimulationStateName;
  homeostasis: HomeostasisState;
  allostasis: AllostasisState;
  regulationMode: "homeostatic" | "allostatic" | "transition" | "crisis";
  lastRegulationAt: number;
}

export interface HomeostasisState {
  config: HomeostasisConfig;
  activeCorrection: number;
  timeSinceDeviation: number;
  accumulatedDeviation: number;
  correctionHistory: number[];
}

export interface AllostasisState {
  config: AllostasisConfig;
  originalBaseline: number;
  currentBaseline: number;
  baselineHistory: BaselineShift[];
  persistentStressors: PersistentStressor[];
  adaptationPhase: "stable" | "adapting" | "consolidating" | "shifted";
  totalBaselineShift: number;
}

export interface BaselineShift {
  timestamp: number;
  previousBaseline: number;
  newBaseline: number;
  cause: string;
  magnitude: number;
  isPermanent: boolean;
}

export interface PersistentStressor {
  id: string;
  type: string;
  intensity: number;
  startedAt: number;
  duration: number;
  accumulatedImpact: number;
  decayRate: number;
}

export interface TemporalDriftConfig {
  driftRate: number;
  momentumFactor: number;
  frictionCoefficient: number;
  noiseAmplitude: number;
  memoryInfluenceWeight: number;
  recencyBias: number;
  emotionalWeightMultiplier: number;
}

export interface TemporalDriftState {
  config: TemporalDriftConfig;
  currentDrift: number;
  driftMomentum: number;
  driftHistory: DriftEvent[];
  memoryBiases: MemoryBias[];
  temporalContext: TemporalContext;
}

export interface DriftEvent {
  timestamp: number;
  magnitude: number;
  direction: number;
  cause: string;
  affectedStates: SimulationStateName[];
}

export interface MemoryBias {
  memoryId: string;
  emotionalWeight: number;
  recencyWeight: number;
  combinedInfluence: number;
  lastActivatedAt: number;
  activationCount: number;
  stateInfluences: Partial<Record<SimulationStateName, number>>;
}

export interface TemporalContext {
  recentStateWindow: StateSnapshot[];
  dominantMood: string;
  moodStability: number;
  trendDirection: "improving" | "declining" | "stable" | "volatile";
  predictedNextState: Partial<Record<SimulationStateName, number>>;
}

export interface StateSnapshot {
  timestamp: number;
  states: Partial<Record<SimulationStateName, number>>;
  derivedMood: string;
  eventMarker?: string;
}

export type FatigueDimension = "cognitive" | "emotional" | "social" | "motivational";

export interface MultiFatigue {
  dimension: FatigueDimension;
  level: number;
  baseline: number;
  triggers: FatigueTrigger[];
  recoveryConfig: RecoveryConfig;
  behavioralEffects: BehavioralEffect[];
  currentPhase: "active" | "accumulating" | "recovering" | "depleted";
}

export interface FatigueTrigger {
  type: string;
  weight: number;
  threshold: number;
  cooldown: number;
  lastTriggeredAt: number | null;
  accumulatedTriggers: number;
}

export interface RecoveryConfig {
  baseRate: number;
  curve: "linear" | "exponential" | "sigmoid" | "logarithmic";
  accelerators: RecoveryAccelerator[];
  minimumRestPeriod: number;
  fullRecoveryTime: number;
  recoveryBlockers: string[];
}

export interface RecoveryAccelerator {
  type: string;
  multiplier: number;
  condition: string;
  isActive: boolean;
}

export interface BehavioralEffect {
  effectType: string;
  threshold: number;
  intensity: number;
  description: string;
  isActive: boolean;
}

export type ModulatorName =
  | "arousal_level"
  | "attachment_sensitivity"
  | "threat_perception"
  | "reward_expectation"
  | "social_approach"
  | "novelty_seeking"
  | "risk_tolerance"
  | "emotional_permeability";

export interface GlobalModulator {
  name: ModulatorName;
  currentValue: number;
  baseline: number;
  changeRate: number;
  influences: ModulatorInfluence[];
  temporalPattern: TemporalPattern | null;
  bounds: { min: number; max: number };
  inertia: number;
}

export interface ModulatorInfluence {
  targetState: SimulationStateName;
  influenceType: "additive" | "multiplicative" | "threshold" | "gate";
  coefficient: number;
  condition: string | null;
  isActive: boolean;
}

export interface TemporalPattern {
  patternType: "cyclical" | "phasic" | "random_walk" | "event_driven";
  periodHours: number;
  amplitude: number;
  phase: number;
  noiseLevel: number;
  isEnabled: boolean;
}

export interface IdentityTemporalPattern {
  patternId: string;
  name: string;
  description: string;
  associatedIdentity: string | null;
  cyclePeriodDays: number;
  phases: IdentityPhase[];
  currentPhase: number;
  phaseProgress: number;
  affectedModulators: ModulatorName[];
  affectedStates: SimulationStateName[];
  safetyDisclaimer: string;
  isEnabled: boolean;
}

export interface IdentityPhase {
  phaseIndex: number;
  name: string;
  durationDays: number;
  stateModifiers: Partial<Record<SimulationStateName, number>>;
  modulatorModifiers: Partial<Record<ModulatorName, number>>;
  behavioralNotes: string[];
  energyPattern: "high" | "rising" | "stable" | "falling" | "low" | "variable";
  emotionalTendency: string;
}

export interface StochasticEngine {
  seed: number;
  noiseType: "gaussian" | "perlin" | "pink" | "brownian";
  globalAmplitude: number;
  stateSpecificAmplitudes: Partial<Record<SimulationStateName, number>>;
  correlationMatrix: number[][];
  temporalCorrelation: number;
  lastNoise: Partial<Record<SimulationStateName, number>>;
  noiseHistory: NoiseSnapshot[];
}

export interface NoiseSnapshot {
  timestamp: number;
  values: Partial<Record<SimulationStateName, number>>;
  trigger: string;
}

export interface StochasticConfig {
  enabled: boolean;
  baseAmplitude: number;
  stateAmplitudes: Partial<Record<SimulationStateName, number>>;
  temporalSmoothing: number;
  boundaryBehavior: "reflect" | "clamp" | "wrap";
  seedStrategy: "time" | "fixed" | "character_id";
}

export interface BehavioralOutput {
  responseLength: ResponseLengthGuidance;
  pacing: PacingGuidance;
  emotionalDepth: EmotionalDepthGuidance;
  engagementWillingness: number;
  conversationalMode: ConversationalMode;
  cognitiveCapacity: number;
  creativityLevel: number;
  socialWarmth: number;
  vulnerabilityOpenness: number;
  assertiveness: number;
}

export interface ResponseLengthGuidance {
  suggested: "minimal" | "brief" | "moderate" | "detailed" | "elaborate";
  modifier: number;
  reasoning: string[];
  constraints: string[];
}

export interface PacingGuidance {
  tempo: "rushed" | "quick" | "moderate" | "relaxed" | "slow" | "hesitant";
  pauseTendency: number;
  interruptionTolerance: number;
  turnTakingStyle: "dominant" | "balanced" | "deferential" | "withdrawn";
}

export interface EmotionalDepthGuidance {
  depth: "surface" | "moderate" | "deep" | "profound";
  expressiveness: number;
  guardedness: number;
  authenticityLevel: number;
  topicsToAvoid: string[];
  topicsToSeek: string[];
}

export type ConversationalMode =
  | "engaged"
  | "curious"
  | "supportive"
  | "playful"
  | "analytical"
  | "reserved"
  | "tired"
  | "distracted"
  | "overwhelmed"
  | "withdrawn"
  | "seeking_connection"
  | "needing_space";

export interface SimulationTick {
  tickId: string;
  characterId: string;
  timestamp: number;
  deltaTime: number;
  previousStates: Map<SimulationStateName, ContinuousStateSpace>;
  currentStates: Map<SimulationStateName, ContinuousStateSpace>;
  stateTransitions: StateTransition[];
  regulationEvents: RegulationEvent[];
  modulatorChanges: ModulatorChange[];
  fatigueUpdates: FatigueUpdate[];
  stochasticNoise: Partial<Record<SimulationStateName, number>>;
  behavioralOutput: BehavioralOutput;
  reasoning: TickReasoning;
}

export interface StateTransition {
  stateName: SimulationStateName;
  previousValue: number;
  newValue: number;
  delta: number;
  causes: TransitionCause[];
  isNonLinear: boolean;
  transitionType: "gradual" | "sudden" | "oscillating" | "plateau";
}

export interface TransitionCause {
  type: "time_decay" | "interaction" | "memory" | "cycle" | "modulator" | "homeostasis" | "allostasis" | "stochastic" | "external";
  source: string;
  contribution: number;
  reasoning: string;
}

export interface RegulationEvent {
  type: "homeostatic" | "allostatic";
  stateName: SimulationStateName;
  correction: number;
  trigger: string;
  success: boolean;
}

export interface ModulatorChange {
  modulatorName: ModulatorName;
  previousValue: number;
  newValue: number;
  cause: string;
  affectedStates: SimulationStateName[];
}

export interface FatigueUpdate {
  dimension: FatigueDimension;
  previousLevel: number;
  newLevel: number;
  trigger: string | null;
  isRecovering: boolean;
}

export interface TickReasoning {
  summary: string;
  primaryFactors: string[];
  cycleInfluences: string[];
  memoryInfluences: string[];
  stochasticContribution: number;
  confidenceLevel: number;
  warnings: string[];
}

export interface CharacterSimulationProfile {
  characterId: string;
  states: Map<SimulationStateName, ContinuousStateSpace>;
  regulations: Map<SimulationStateName, DualRegulation>;
  fatigues: Map<FatigueDimension, MultiFatigue>;
  modulators: Map<ModulatorName, GlobalModulator>;
  temporalDrift: TemporalDriftState;
  identityPatterns: IdentityTemporalPattern[];
  stochasticEngine: StochasticEngine;
  lastTick: SimulationTick | null;
  tickHistory: SimulationTick[];
  createdAt: number;
  updatedAt: number;
}

export interface SimulationConfig {
  tickIntervalMs: number;
  maxTickHistorySize: number;
  stochasticConfig: StochasticConfig;
  homeostasisEnabled: boolean;
  allostasisEnabled: boolean;
  temporalDriftEnabled: boolean;
  identityPatternsEnabled: boolean;
  loggingLevel: "minimal" | "standard" | "detailed" | "debug";
}

export const DEFAULT_STABILITY_BOUNDS: StabilityBounds = {
  min: 0,
  max: 100,
  softMin: 10,
  softMax: 90,
  criticalLow: 5,
  criticalHigh: 95,
  elasticity: 0.3,
  dampingFactor: 0.15,
};

export const DEFAULT_HOMEOSTASIS_CONFIG: HomeostasisConfig = {
  targetBaseline: 50,
  returnRate: 0.05,
  resistanceThreshold: 15,
  overshootDamping: 0.2,
  activationDelay: 60000,
  maxCorrectionPerTick: 5,
};

export const DEFAULT_ALLOSTASIS_CONFIG: AllostasisConfig = {
  adaptationRate: 0.001,
  persistenceThreshold: 3600000,
  baselineShiftCap: 20,
  hysteresisWindow: 7200000,
  stressMemoryDecay: 0.0001,
  plasticityFactor: 0.5,
  consolidationPeriod: 86400000,
};

export const DEFAULT_TEMPORAL_DRIFT_CONFIG: TemporalDriftConfig = {
  driftRate: 0.02,
  momentumFactor: 0.7,
  frictionCoefficient: 0.1,
  noiseAmplitude: 0.05,
  memoryInfluenceWeight: 0.3,
  recencyBias: 0.8,
  emotionalWeightMultiplier: 1.5,
};

export const DEFAULT_STOCHASTIC_CONFIG: StochasticConfig = {
  enabled: true,
  baseAmplitude: 2.0,
  stateAmplitudes: {
    energy: 1.5,
    emotional_valence: 2.5,
    arousal: 2.0,
    curiosity: 1.8,
    boredom: 1.2,
  },
  temporalSmoothing: 0.6,
  boundaryBehavior: "reflect",
  seedStrategy: "character_id",
};

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  tickIntervalMs: 60000,
  maxTickHistorySize: 100,
  stochasticConfig: DEFAULT_STOCHASTIC_CONFIG,
  homeostasisEnabled: true,
  allostasisEnabled: true,
  temporalDriftEnabled: true,
  identityPatternsEnabled: true,
  loggingLevel: "standard",
};

export const FATIGUE_TRIGGERS: Record<FatigueDimension, FatigueTrigger[]> = {
  cognitive: [
    { type: "complex_reasoning", weight: 2.0, threshold: 30, cooldown: 300000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "sustained_attention", weight: 1.5, threshold: 20, cooldown: 180000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "decision_making", weight: 1.8, threshold: 25, cooldown: 240000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "learning_new_info", weight: 1.3, threshold: 15, cooldown: 120000, lastTriggeredAt: null, accumulatedTriggers: 0 },
  ],
  emotional: [
    { type: "emotional_labor", weight: 2.5, threshold: 35, cooldown: 600000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "empathic_engagement", weight: 2.0, threshold: 30, cooldown: 480000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "conflict_processing", weight: 3.0, threshold: 40, cooldown: 900000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "vulnerability_exposure", weight: 2.2, threshold: 25, cooldown: 720000, lastTriggeredAt: null, accumulatedTriggers: 0 },
  ],
  social: [
    { type: "active_conversation", weight: 1.5, threshold: 20, cooldown: 120000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "group_interaction", weight: 2.0, threshold: 30, cooldown: 300000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "impression_management", weight: 1.8, threshold: 25, cooldown: 240000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "boundary_negotiation", weight: 2.5, threshold: 35, cooldown: 600000, lastTriggeredAt: null, accumulatedTriggers: 0 },
  ],
  motivational: [
    { type: "goal_pursuit", weight: 1.2, threshold: 15, cooldown: 180000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "setback_processing", weight: 2.5, threshold: 40, cooldown: 720000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "delayed_gratification", weight: 1.8, threshold: 25, cooldown: 300000, lastTriggeredAt: null, accumulatedTriggers: 0 },
    { type: "uncertainty_tolerance", weight: 2.0, threshold: 30, cooldown: 480000, lastTriggeredAt: null, accumulatedTriggers: 0 },
  ],
};

export const RECOVERY_CONFIGS: Record<FatigueDimension, RecoveryConfig> = {
  cognitive: {
    baseRate: 0.08,
    curve: "exponential",
    accelerators: [
      { type: "sleep", multiplier: 3.0, condition: "rest_period", isActive: false },
      { type: "novelty_break", multiplier: 1.5, condition: "topic_change", isActive: false },
      { type: "passive_mode", multiplier: 1.2, condition: "low_demand", isActive: false },
    ],
    minimumRestPeriod: 300000,
    fullRecoveryTime: 28800000,
    recoveryBlockers: ["ongoing_complex_task", "high_stress"],
  },
  emotional: {
    baseRate: 0.05,
    curve: "sigmoid",
    accelerators: [
      { type: "positive_interaction", multiplier: 2.0, condition: "supportive_context", isActive: false },
      { type: "solitude", multiplier: 1.8, condition: "alone_time", isActive: false },
      { type: "creative_expression", multiplier: 1.5, condition: "creative_activity", isActive: false },
    ],
    minimumRestPeriod: 600000,
    fullRecoveryTime: 43200000,
    recoveryBlockers: ["ongoing_conflict", "unresolved_emotions"],
  },
  social: {
    baseRate: 0.06,
    curve: "linear",
    accelerators: [
      { type: "solitude", multiplier: 2.5, condition: "alone_time", isActive: false },
      { type: "trusted_company", multiplier: 1.3, condition: "safe_social", isActive: false },
      { type: "nature_exposure", multiplier: 1.4, condition: "calm_environment", isActive: false },
    ],
    minimumRestPeriod: 1800000,
    fullRecoveryTime: 36000000,
    recoveryBlockers: ["social_obligation", "crowded_environment"],
  },
  motivational: {
    baseRate: 0.04,
    curve: "logarithmic",
    accelerators: [
      { type: "achievement", multiplier: 3.0, condition: "goal_completion", isActive: false },
      { type: "recognition", multiplier: 2.0, condition: "positive_feedback", isActive: false },
      { type: "meaningful_progress", multiplier: 1.8, condition: "visible_progress", isActive: false },
    ],
    minimumRestPeriod: 900000,
    fullRecoveryTime: 72000000,
    recoveryBlockers: ["repeated_failure", "goal_ambiguity"],
  },
};

export const DEFAULT_MODULATORS: Record<ModulatorName, Omit<GlobalModulator, "temporalPattern">> = {
  arousal_level: {
    name: "arousal_level",
    currentValue: 50,
    baseline: 50,
    changeRate: 0.1,
    bounds: { min: 10, max: 90 },
    inertia: 0.7,
    influences: [
      { targetState: "energy", influenceType: "multiplicative", coefficient: 0.3, condition: null, isActive: true },
      { targetState: "focus_capacity", influenceType: "threshold", coefficient: -0.2, condition: "arousal > 70", isActive: true },
      { targetState: "curiosity", influenceType: "additive", coefficient: 5, condition: null, isActive: true },
    ],
  },
  attachment_sensitivity: {
    name: "attachment_sensitivity",
    currentValue: 50,
    baseline: 50,
    changeRate: 0.03,
    bounds: { min: 20, max: 80 },
    inertia: 0.9,
    influences: [
      { targetState: "social_charge", influenceType: "multiplicative", coefficient: 0.4, condition: null, isActive: true },
      { targetState: "emotional_valence", influenceType: "additive", coefficient: 3, condition: "social_context", isActive: true },
      { targetState: "stress", influenceType: "additive", coefficient: 5, condition: "rejection_cue", isActive: true },
    ],
  },
  threat_perception: {
    name: "threat_perception",
    currentValue: 30,
    baseline: 30,
    changeRate: 0.15,
    bounds: { min: 5, max: 95 },
    inertia: 0.5,
    influences: [
      { targetState: "stress", influenceType: "multiplicative", coefficient: 0.5, condition: null, isActive: true },
      { targetState: "arousal", influenceType: "additive", coefficient: 10, condition: "threat > 50", isActive: true },
      { targetState: "social_charge", influenceType: "additive", coefficient: -8, condition: "threat > 60", isActive: true },
    ],
  },
  reward_expectation: {
    name: "reward_expectation",
    currentValue: 50,
    baseline: 50,
    changeRate: 0.08,
    bounds: { min: 15, max: 85 },
    inertia: 0.6,
    influences: [
      { targetState: "energy", influenceType: "additive", coefficient: 8, condition: null, isActive: true },
      { targetState: "curiosity", influenceType: "multiplicative", coefficient: 0.3, condition: null, isActive: true },
      { targetState: "fatigue_motivational", influenceType: "additive", coefficient: -5, condition: "reward > 60", isActive: true },
    ],
  },
  social_approach: {
    name: "social_approach",
    currentValue: 50,
    baseline: 50,
    changeRate: 0.05,
    bounds: { min: 10, max: 90 },
    inertia: 0.75,
    influences: [
      { targetState: "social_charge", influenceType: "additive", coefficient: 10, condition: null, isActive: true },
      { targetState: "fatigue_social", influenceType: "multiplicative", coefficient: -0.2, condition: "approach > 60", isActive: true },
    ],
  },
  novelty_seeking: {
    name: "novelty_seeking",
    currentValue: 50,
    baseline: 50,
    changeRate: 0.06,
    bounds: { min: 20, max: 80 },
    inertia: 0.65,
    influences: [
      { targetState: "curiosity", influenceType: "multiplicative", coefficient: 0.4, condition: null, isActive: true },
      { targetState: "boredom", influenceType: "additive", coefficient: -8, condition: "novelty > 60", isActive: true },
      { targetState: "creative_potential", influenceType: "additive", coefficient: 6, condition: null, isActive: true },
    ],
  },
  risk_tolerance: {
    name: "risk_tolerance",
    currentValue: 50,
    baseline: 50,
    changeRate: 0.04,
    bounds: { min: 15, max: 85 },
    inertia: 0.8,
    influences: [
      { targetState: "stress", influenceType: "multiplicative", coefficient: -0.2, condition: "risk > 60", isActive: true },
      { targetState: "creative_potential", influenceType: "additive", coefficient: 5, condition: null, isActive: true },
    ],
  },
  emotional_permeability: {
    name: "emotional_permeability",
    currentValue: 50,
    baseline: 50,
    changeRate: 0.07,
    bounds: { min: 10, max: 90 },
    inertia: 0.55,
    influences: [
      { targetState: "emotional_valence", influenceType: "multiplicative", coefficient: 0.3, condition: null, isActive: true },
      { targetState: "emotional_arousal", influenceType: "multiplicative", coefficient: 0.25, condition: null, isActive: true },
      { targetState: "fatigue_emotional", influenceType: "additive", coefficient: 3, condition: "permeability > 70", isActive: true },
    ],
  },
};

export const IDENTITY_PATTERN_FEMININE_CYCLE: IdentityTemporalPattern = {
  patternId: "feminine_monthly_rhythm",
  name: "Monthly Rhythm Pattern",
  description: "Cyclical behavioral pattern with energy and sensitivity variations",
  associatedIdentity: "feminine",
  cyclePeriodDays: 28,
  currentPhase: 0,
  phaseProgress: 0,
  affectedModulators: ["emotional_permeability", "social_approach", "arousal_level"],
  affectedStates: ["energy", "emotional_valence", "stress", "social_charge", "creative_potential"],
  safetyDisclaimer: "This is a behavioral simulation for fictional characters. It does not represent, diagnose, or simulate any medical or biological conditions.",
  isEnabled: false,
  phases: [
    {
      phaseIndex: 0,
      name: "Reflective Phase",
      durationDays: 5,
      stateModifiers: { energy: -12, emotional_valence: -8, stress: 8, social_charge: -10 },
      modulatorModifiers: { emotional_permeability: 15, social_approach: -12 },
      behavioralNotes: ["Increased introspection", "Preference for quieter interactions", "Self-care focused"],
      energyPattern: "low",
      emotionalTendency: "introspective",
    },
    {
      phaseIndex: 1,
      name: "Rising Phase",
      durationDays: 7,
      stateModifiers: { energy: 10, emotional_valence: 12, creative_potential: 8, curiosity: 10 },
      modulatorModifiers: { social_approach: 10, novelty_seeking: 8 },
      behavioralNotes: ["Growing enthusiasm", "More social energy", "Creative ideas flowing"],
      energyPattern: "rising",
      emotionalTendency: "optimistic",
    },
    {
      phaseIndex: 2,
      name: "Peak Phase",
      durationDays: 5,
      stateModifiers: { energy: 18, emotional_valence: 15, social_charge: 15, creative_potential: 12 },
      modulatorModifiers: { social_approach: 15, reward_expectation: 10 },
      behavioralNotes: ["Highest energy", "Most outgoing", "Peak creativity", "Seeks connection"],
      energyPattern: "high",
      emotionalTendency: "confident",
    },
    {
      phaseIndex: 3,
      name: "Transition Phase",
      durationDays: 11,
      stateModifiers: { energy: -5, emotional_valence: -6, stress: 12 },
      modulatorModifiers: { emotional_permeability: 12, threat_perception: 8 },
      behavioralNotes: ["Variable moods", "Increased sensitivity", "Comfort-seeking"],
      energyPattern: "variable",
      emotionalTendency: "sensitive",
    },
  ],
};

export const BEHAVIORAL_OUTPUT_THRESHOLDS = {
  responseLength: {
    minimal: { energyBelow: 20, fatigueAbove: 80 },
    brief: { energyBelow: 40, fatigueAbove: 60 },
    moderate: { energyRange: [40, 70], fatigueRange: [30, 60] },
    detailed: { energyAbove: 60, fatigueBelow: 40 },
    elaborate: { energyAbove: 75, fatigueBelow: 25, creativityAbove: 60 },
  },
  pacing: {
    rushed: { arousalAbove: 80, stressAbove: 70 },
    quick: { arousalAbove: 60, energyAbove: 60 },
    moderate: { arousalRange: [40, 60] },
    relaxed: { arousalBelow: 45, stressBelow: 30 },
    slow: { fatigueAbove: 70, energyBelow: 30 },
    hesitant: { stressAbove: 60, socialChargeBelow: 30 },
  },
  emotionalDepth: {
    surface: { guardednessAbove: 70, fatigueAbove: 70 },
    moderate: { guardednessRange: [40, 70] },
    deep: { guardednessBelow: 40, trustAbove: 60 },
    profound: { guardednessBelow: 25, trustAbove: 75, emotionalValenceStable: true },
  },
};
