import type { SimulationStateName, ModulatorName } from "./continuous-simulation";

export type BehaviorFieldDimension =
  | "approach_withdrawal"
  | "curiosity_bias"
  | "emotional_openness"
  | "resistance_defensiveness"
  | "engagement_intensity"
  | "vulnerability_exposure"
  | "assertiveness_deference"
  | "novelty_familiarity";

export interface BehaviorFieldVector {
  dimension: BehaviorFieldDimension;
  value: number;
  uncertainty: number;
  momentum: number;
  bounds: { min: number; max: number };
  lastUpdatedAt: number;
}

export interface BehaviorField {
  characterId: string;
  vectors: Map<BehaviorFieldDimension, BehaviorFieldVector>;
  fieldStrength: number;
  coherence: number;
  entropy: number;
  lastComputedAt: number;
}

export interface BehaviorProbability {
  behaviorClass: BehaviorClass;
  baseProbability: number;
  fieldModifiedProbability: number;
  contextModifier: number;
  finalProbability: number;
  contributingFactors: ProbabilityFactor[];
}

export interface ProbabilityFactor {
  source: string;
  dimension: BehaviorFieldDimension | SimulationStateName | ModulatorName;
  contribution: number;
  direction: "increase" | "decrease";
}

export type BehaviorClass =
  | "engage_deeply"
  | "engage_lightly"
  | "maintain_distance"
  | "withdraw_gently"
  | "withdraw_firmly"
  | "explore_curiously"
  | "respond_defensively"
  | "open_vulnerably"
  | "assert_boundary"
  | "seek_connection"
  | "offer_support"
  | "request_support"
  | "challenge_playfully"
  | "challenge_seriously"
  | "deflect_topic"
  | "deepen_topic";

export interface PatternSignature {
  id: string;
  signatureType: PatternType;
  fingerprint: string;
  strength: number;
  frequency: number;
  firstObservedAt: number;
  lastObservedAt: number;
  observationCount: number;
  contextTags: string[];
  emotionalValence: number;
  behaviorClasses: BehaviorClass[];
  stateCorrelations: Partial<Record<SimulationStateName, number>>;
  isNovel: boolean;
  noveltyScore: number;
}

export type PatternType =
  | "interaction_repetition"
  | "emotional_context_similarity"
  | "response_bias_persistence"
  | "state_sequence"
  | "trigger_response_pair"
  | "cyclical_behavior"
  | "escalation_pattern"
  | "de_escalation_pattern"
  | "avoidance_pattern"
  | "approach_pattern";

export interface PatternAccumulator {
  characterId: string;
  signatures: Map<string, PatternSignature>;
  recentPatterns: PatternObservation[];
  patternThresholds: PatternThresholds;
  compressionLevel: number;
  lastCompactionAt: number;
}

export interface PatternObservation {
  timestamp: number;
  patternType: PatternType;
  rawData: PatternRawData;
  signatureId: string | null;
  matchScore: number;
  isNewPattern: boolean;
}

export interface PatternRawData {
  behaviorClass: BehaviorClass;
  triggerContext: string;
  emotionalState: number;
  stateSnapshot: Partial<Record<SimulationStateName, number>>;
  responseCharacteristics: ResponseCharacteristics;
}

export interface ResponseCharacteristics {
  length: "minimal" | "brief" | "moderate" | "detailed" | "elaborate";
  emotionalTone: "positive" | "neutral" | "negative" | "mixed";
  engagementLevel: number;
  topicDepth: number;
  assertiveness: number;
}

export interface PatternThresholds {
  minObservationsForPattern: number;
  similarityThreshold: number;
  noveltyThreshold: number;
  signatureDecayRate: number;
  maxSignatures: number;
  compactionInterval: number;
}

export type LatentTendencyName =
  | "attachment_drift"
  | "avoidance_gradient"
  | "trust_inertia"
  | "intimacy_momentum"
  | "conflict_aversion"
  | "novelty_adaptation"
  | "vulnerability_resistance"
  | "connection_seeking"
  | "autonomy_preservation"
  | "emotional_dampening";

export interface LatentTendency {
  name: LatentTendencyName;
  currentValue: number;
  baseline: number;
  velocity: number;
  acceleration: number;
  inertia: number;
  bounds: { min: number; max: number };
  influencedBy: TendencyInfluencer[];
  influences: TendencyTarget[];
  lastUpdatedAt: number;
  history: TendencySnapshot[];
}

export interface TendencyInfluencer {
  source: "pattern" | "state" | "modulator" | "interaction" | "time";
  sourceId: string;
  weight: number;
  direction: "positive" | "negative";
  condition: string | null;
}

export interface TendencyTarget {
  targetType: "behavior_field" | "state" | "modulator" | "pattern_sensitivity";
  targetId: string;
  influenceStrength: number;
  influenceType: "additive" | "multiplicative" | "threshold";
}

export interface TendencySnapshot {
  timestamp: number;
  value: number;
  velocity: number;
  trigger: string;
}

export interface LatentTendencySystem {
  characterId: string;
  tendencies: Map<LatentTendencyName, LatentTendency>;
  globalDrift: number;
  systemStability: number;
  lastUpdateAt: number;
}

export type EmergenceType =
  | "novel_behavior_pattern"
  | "feedback_loop_positive"
  | "feedback_loop_negative"
  | "over_engagement"
  | "withdrawal_spiral"
  | "personality_drift"
  | "attachment_shift"
  | "defense_escalation"
  | "trust_collapse"
  | "trust_breakthrough"
  | "emotional_flooding"
  | "emotional_numbing"
  | "pattern_crystallization"
  | "pattern_dissolution";

export interface EmergentPhenomenon {
  id: string;
  characterId: string;
  emergenceType: EmergenceType;
  severity: "low" | "moderate" | "high" | "critical";
  detectedAt: number;
  confidence: number;
  contributingStates: StateContribution[];
  contributingPatterns: PatternContribution[];
  contributingTendencies: TendencyContribution[];
  trajectoryPrediction: TrajectoryPrediction;
  governanceResponse: GovernanceResponse | null;
  isActive: boolean;
  resolvedAt: number | null;
  reasoning: EmergenceReasoning;
}

export interface StateContribution {
  stateName: SimulationStateName;
  currentValue: number;
  deviationFromBaseline: number;
  contributionWeight: number;
}

export interface PatternContribution {
  patternId: string;
  patternType: PatternType;
  strength: number;
  frequency: number;
  contributionWeight: number;
}

export interface TendencyContribution {
  tendencyName: LatentTendencyName;
  currentValue: number;
  velocity: number;
  contributionWeight: number;
}

export interface TrajectoryPrediction {
  predictedOutcome: string;
  timeframeHours: number;
  confidence: number;
  riskLevel: "none" | "low" | "moderate" | "high" | "severe";
  recommendedAction: string;
}

export interface EmergenceReasoning {
  summary: string;
  detectionMethod: string;
  evidenceChain: string[];
  alternativeInterpretations: string[];
  confidenceFactors: string[];
}

export interface EmergenceDetector {
  characterId: string;
  activeMonitors: EmergenceMonitor[];
  detectionHistory: EmergentPhenomenon[];
  thresholds: EmergenceThresholds;
  lastScanAt: number;
}

export interface EmergenceMonitor {
  monitorType: EmergenceType;
  isActive: boolean;
  sensitivity: number;
  cooldownMs: number;
  lastTriggeredAt: number | null;
  triggerConditions: TriggerCondition[];
}

export interface TriggerCondition {
  conditionType: "threshold" | "rate_of_change" | "pattern_match" | "combination";
  parameters: Record<string, number | string>;
  weight: number;
}

export interface EmergenceThresholds {
  noveltyPatternThreshold: number;
  feedbackLoopThreshold: number;
  overEngagementThreshold: number;
  withdrawalThreshold: number;
  personalityDriftThreshold: number;
  trustChangeThreshold: number;
  emotionalFloodingThreshold: number;
}

export type GovernanceAction =
  | "bias_rebalancing"
  | "recovery_pressure_increase"
  | "recovery_pressure_decrease"
  | "resistance_modulation"
  | "drift_dampening"
  | "pattern_weakening"
  | "tendency_correction"
  | "field_stabilization"
  | "cooldown_enforcement"
  | "gradual_reset";

export interface GovernanceResponse {
  id: string;
  phenomenonId: string;
  action: GovernanceAction;
  intensity: number;
  targetSystem: "behavior_field" | "pattern" | "tendency" | "state" | "modulator";
  targetId: string;
  appliedAt: number;
  duration: number;
  expectedEffect: string;
  actualEffect: string | null;
  isActive: boolean;
  completedAt: number | null;
}

export interface SoftGovernor {
  characterId: string;
  activeResponses: GovernanceResponse[];
  governanceHistory: GovernanceResponse[];
  rebalancingRate: number;
  maxCorrectionPerTick: number;
  governancePhilosophy: GovernancePhilosophy;
  lastGovernanceAt: number;
}

export interface GovernancePhilosophy {
  preferGradualChange: boolean;
  allowedActions: GovernanceAction[];
  forbiddenActions: GovernanceAction[];
  maxSimultaneousActions: number;
  minTimeBetweenActions: number;
  emergencyOverrideThreshold: number;
}

export interface EmergentBehaviorLog {
  id: string;
  characterId: string;
  timestamp: number;
  logType: "detection" | "governance" | "pattern" | "tendency" | "field";
  eventDescription: string;
  systemSnapshot: SystemSnapshot;
  metadata: Record<string, unknown>;
}

export interface SystemSnapshot {
  behaviorField: Partial<Record<BehaviorFieldDimension, number>>;
  activePatterns: string[];
  tendencyValues: Partial<Record<LatentTendencyName, number>>;
  emergentPhenomena: string[];
  governanceActions: string[];
}

export interface ExplainabilityReport {
  characterId: string;
  generatedAt: number;
  timeframeStart: number;
  timeframeEnd: number;
  summary: string;
  behaviorFieldAnalysis: FieldAnalysis;
  patternAnalysis: PatternAnalysis;
  tendencyAnalysis: TendencyAnalysis;
  emergenceAnalysis: EmergenceAnalysis;
  governanceAnalysis: GovernanceAnalysis;
  recommendations: string[];
}

export interface FieldAnalysis {
  dominantDimension: BehaviorFieldDimension;
  fieldCoherence: number;
  entropy: number;
  stabilityTrend: "stable" | "increasing" | "decreasing" | "volatile";
  dimensionBreakdown: Array<{ dimension: BehaviorFieldDimension; value: number; trend: string }>;
}

export interface PatternAnalysis {
  totalPatterns: number;
  novelPatterns: number;
  dominantPatternType: PatternType;
  patternDiversity: number;
  recentPatternTrend: string;
}

export interface TendencyAnalysis {
  overallDrift: number;
  mostActiveTemendency: LatentTendencyName;
  stabilityScore: number;
  concerningTendencies: LatentTendencyName[];
}

export interface EmergenceAnalysis {
  activeEmergences: number;
  resolvedEmergences: number;
  criticalEvents: number;
  overallRiskLevel: "low" | "moderate" | "high";
}

export interface GovernanceAnalysis {
  actionsApplied: number;
  averageEffectiveness: number;
  mostCommonAction: GovernanceAction;
  governanceLoad: number;
}

export const DEFAULT_BEHAVIOR_FIELD_VECTORS: Record<BehaviorFieldDimension, Omit<BehaviorFieldVector, "lastUpdatedAt">> = {
  approach_withdrawal: { dimension: "approach_withdrawal", value: 0, uncertainty: 20, momentum: 0, bounds: { min: -100, max: 100 } },
  curiosity_bias: { dimension: "curiosity_bias", value: 20, uncertainty: 15, momentum: 0, bounds: { min: -50, max: 100 } },
  emotional_openness: { dimension: "emotional_openness", value: 30, uncertainty: 25, momentum: 0, bounds: { min: 0, max: 100 } },
  resistance_defensiveness: { dimension: "resistance_defensiveness", value: 20, uncertainty: 20, momentum: 0, bounds: { min: 0, max: 100 } },
  engagement_intensity: { dimension: "engagement_intensity", value: 50, uncertainty: 15, momentum: 0, bounds: { min: 0, max: 100 } },
  vulnerability_exposure: { dimension: "vulnerability_exposure", value: 25, uncertainty: 30, momentum: 0, bounds: { min: 0, max: 100 } },
  assertiveness_deference: { dimension: "assertiveness_deference", value: 0, uncertainty: 20, momentum: 0, bounds: { min: -100, max: 100 } },
  novelty_familiarity: { dimension: "novelty_familiarity", value: 10, uncertainty: 25, momentum: 0, bounds: { min: -100, max: 100 } },
};

export const DEFAULT_LATENT_TENDENCIES: Record<LatentTendencyName, Omit<LatentTendency, "history" | "lastUpdatedAt">> = {
  attachment_drift: {
    name: "attachment_drift",
    currentValue: 0,
    baseline: 0,
    velocity: 0,
    acceleration: 0,
    inertia: 0.9,
    bounds: { min: -50, max: 50 },
    influencedBy: [
      { source: "pattern", sourceId: "approach_pattern", weight: 0.3, direction: "positive", condition: null },
      { source: "pattern", sourceId: "avoidance_pattern", weight: 0.3, direction: "negative", condition: null },
      { source: "state", sourceId: "social_charge", weight: 0.2, direction: "positive", condition: "value > 60" },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "approach_withdrawal", influenceStrength: 0.4, influenceType: "additive" },
      { targetType: "modulator", targetId: "attachment_sensitivity", influenceStrength: 0.3, influenceType: "additive" },
    ],
  },
  avoidance_gradient: {
    name: "avoidance_gradient",
    currentValue: 0,
    baseline: 0,
    velocity: 0,
    acceleration: 0,
    inertia: 0.85,
    bounds: { min: 0, max: 100 },
    influencedBy: [
      { source: "state", sourceId: "stress", weight: 0.4, direction: "positive", condition: "value > 50" },
      { source: "pattern", sourceId: "avoidance_pattern", weight: 0.3, direction: "positive", condition: null },
      { source: "modulator", sourceId: "threat_perception", weight: 0.3, direction: "positive", condition: null },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "approach_withdrawal", influenceStrength: -0.5, influenceType: "additive" },
      { targetType: "behavior_field", targetId: "resistance_defensiveness", influenceStrength: 0.3, influenceType: "additive" },
    ],
  },
  trust_inertia: {
    name: "trust_inertia",
    currentValue: 50,
    baseline: 50,
    velocity: 0,
    acceleration: 0,
    inertia: 0.95,
    bounds: { min: 0, max: 100 },
    influencedBy: [
      { source: "interaction", sourceId: "positive_exchange", weight: 0.2, direction: "positive", condition: null },
      { source: "interaction", sourceId: "negative_exchange", weight: 0.4, direction: "negative", condition: null },
      { source: "time", sourceId: "consistency", weight: 0.1, direction: "positive", condition: null },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "emotional_openness", influenceStrength: 0.5, influenceType: "multiplicative" },
      { targetType: "behavior_field", targetId: "vulnerability_exposure", influenceStrength: 0.4, influenceType: "multiplicative" },
    ],
  },
  intimacy_momentum: {
    name: "intimacy_momentum",
    currentValue: 0,
    baseline: 0,
    velocity: 0,
    acceleration: 0,
    inertia: 0.88,
    bounds: { min: -100, max: 100 },
    influencedBy: [
      { source: "pattern", sourceId: "approach_pattern", weight: 0.35, direction: "positive", condition: null },
      { source: "state", sourceId: "emotional_valence", weight: 0.25, direction: "positive", condition: "value > 55" },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "vulnerability_exposure", influenceStrength: 0.4, influenceType: "additive" },
      { targetType: "behavior_field", targetId: "emotional_openness", influenceStrength: 0.3, influenceType: "additive" },
    ],
  },
  conflict_aversion: {
    name: "conflict_aversion",
    currentValue: 40,
    baseline: 40,
    velocity: 0,
    acceleration: 0,
    inertia: 0.92,
    bounds: { min: 0, max: 100 },
    influencedBy: [
      { source: "pattern", sourceId: "de_escalation_pattern", weight: 0.3, direction: "positive", condition: null },
      { source: "state", sourceId: "stress", weight: 0.3, direction: "positive", condition: null },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "assertiveness_deference", influenceStrength: -0.3, influenceType: "additive" },
      { targetType: "pattern_sensitivity", targetId: "escalation_pattern", influenceStrength: -0.4, influenceType: "multiplicative" },
    ],
  },
  novelty_adaptation: {
    name: "novelty_adaptation",
    currentValue: 50,
    baseline: 50,
    velocity: 0,
    acceleration: 0,
    inertia: 0.8,
    bounds: { min: 0, max: 100 },
    influencedBy: [
      { source: "modulator", sourceId: "novelty_seeking", weight: 0.4, direction: "positive", condition: null },
      { source: "state", sourceId: "boredom", weight: 0.3, direction: "positive", condition: "value > 50" },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "novelty_familiarity", influenceStrength: 0.5, influenceType: "additive" },
      { targetType: "behavior_field", targetId: "curiosity_bias", influenceStrength: 0.3, influenceType: "additive" },
    ],
  },
  vulnerability_resistance: {
    name: "vulnerability_resistance",
    currentValue: 30,
    baseline: 30,
    velocity: 0,
    acceleration: 0,
    inertia: 0.9,
    bounds: { min: 0, max: 100 },
    influencedBy: [
      { source: "pattern", sourceId: "avoidance_pattern", weight: 0.35, direction: "positive", condition: null },
      { source: "state", sourceId: "stress", weight: 0.25, direction: "positive", condition: "value > 40" },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "vulnerability_exposure", influenceStrength: -0.6, influenceType: "multiplicative" },
      { targetType: "behavior_field", targetId: "resistance_defensiveness", influenceStrength: 0.3, influenceType: "additive" },
    ],
  },
  connection_seeking: {
    name: "connection_seeking",
    currentValue: 50,
    baseline: 50,
    velocity: 0,
    acceleration: 0,
    inertia: 0.85,
    bounds: { min: 0, max: 100 },
    influencedBy: [
      { source: "state", sourceId: "social_charge", weight: 0.3, direction: "negative", condition: "value < 40" },
      { source: "modulator", sourceId: "social_approach", weight: 0.35, direction: "positive", condition: null },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "approach_withdrawal", influenceStrength: 0.4, influenceType: "additive" },
      { targetType: "behavior_field", targetId: "engagement_intensity", influenceStrength: 0.3, influenceType: "additive" },
    ],
  },
  autonomy_preservation: {
    name: "autonomy_preservation",
    currentValue: 50,
    baseline: 50,
    velocity: 0,
    acceleration: 0,
    inertia: 0.92,
    bounds: { min: 0, max: 100 },
    influencedBy: [
      { source: "pattern", sourceId: "avoidance_pattern", weight: 0.25, direction: "positive", condition: null },
      { source: "state", sourceId: "fatigue_social", weight: 0.3, direction: "positive", condition: "value > 50" },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "approach_withdrawal", influenceStrength: -0.3, influenceType: "additive" },
      { targetType: "behavior_field", targetId: "assertiveness_deference", influenceStrength: 0.25, influenceType: "additive" },
    ],
  },
  emotional_dampening: {
    name: "emotional_dampening",
    currentValue: 20,
    baseline: 20,
    velocity: 0,
    acceleration: 0,
    inertia: 0.88,
    bounds: { min: 0, max: 100 },
    influencedBy: [
      { source: "state", sourceId: "fatigue_emotional", weight: 0.4, direction: "positive", condition: "value > 60" },
      { source: "state", sourceId: "stress", weight: 0.3, direction: "positive", condition: "value > 70" },
    ],
    influences: [
      { targetType: "behavior_field", targetId: "emotional_openness", influenceStrength: -0.5, influenceType: "multiplicative" },
      { targetType: "state", targetId: "emotional_arousal", influenceStrength: -0.3, influenceType: "multiplicative" },
    ],
  },
};

export const DEFAULT_PATTERN_THRESHOLDS: PatternThresholds = {
  minObservationsForPattern: 3,
  similarityThreshold: 0.75,
  noveltyThreshold: 0.6,
  signatureDecayRate: 0.001,
  maxSignatures: 100,
  compactionInterval: 86400000,
};

export const DEFAULT_EMERGENCE_THRESHOLDS: EmergenceThresholds = {
  noveltyPatternThreshold: 0.7,
  feedbackLoopThreshold: 0.6,
  overEngagementThreshold: 85,
  withdrawalThreshold: 20,
  personalityDriftThreshold: 25,
  trustChangeThreshold: 30,
  emotionalFloodingThreshold: 80,
};

export const DEFAULT_GOVERNANCE_PHILOSOPHY: GovernancePhilosophy = {
  preferGradualChange: true,
  allowedActions: [
    "bias_rebalancing",
    "recovery_pressure_increase",
    "recovery_pressure_decrease",
    "resistance_modulation",
    "drift_dampening",
    "pattern_weakening",
    "tendency_correction",
    "field_stabilization",
    "cooldown_enforcement",
  ],
  forbiddenActions: ["gradual_reset"],
  maxSimultaneousActions: 3,
  minTimeBetweenActions: 300000,
  emergencyOverrideThreshold: 0.9,
};

export const BEHAVIOR_CLASS_FIELD_MAPPINGS: Record<BehaviorClass, Partial<Record<BehaviorFieldDimension, { weight: number; threshold?: number }>>> = {
  engage_deeply: { approach_withdrawal: { weight: 0.8 }, engagement_intensity: { weight: 0.9 }, emotional_openness: { weight: 0.6 } },
  engage_lightly: { approach_withdrawal: { weight: 0.4 }, engagement_intensity: { weight: 0.5 } },
  maintain_distance: { approach_withdrawal: { weight: -0.2 }, resistance_defensiveness: { weight: 0.3 } },
  withdraw_gently: { approach_withdrawal: { weight: -0.5 }, engagement_intensity: { weight: -0.4 } },
  withdraw_firmly: { approach_withdrawal: { weight: -0.9 }, resistance_defensiveness: { weight: 0.7 } },
  explore_curiously: { curiosity_bias: { weight: 0.9 }, novelty_familiarity: { weight: 0.7 } },
  respond_defensively: { resistance_defensiveness: { weight: 0.9 }, approach_withdrawal: { weight: -0.4 } },
  open_vulnerably: { vulnerability_exposure: { weight: 0.9 }, emotional_openness: { weight: 0.8 } },
  assert_boundary: { assertiveness_deference: { weight: 0.8 }, resistance_defensiveness: { weight: 0.4 } },
  seek_connection: { approach_withdrawal: { weight: 0.7 }, emotional_openness: { weight: 0.6 } },
  offer_support: { approach_withdrawal: { weight: 0.5 }, emotional_openness: { weight: 0.7 }, engagement_intensity: { weight: 0.6 } },
  request_support: { vulnerability_exposure: { weight: 0.6 }, approach_withdrawal: { weight: 0.4 } },
  challenge_playfully: { assertiveness_deference: { weight: 0.4 }, curiosity_bias: { weight: 0.5 }, engagement_intensity: { weight: 0.6 } },
  challenge_seriously: { assertiveness_deference: { weight: 0.8 }, engagement_intensity: { weight: 0.7 } },
  deflect_topic: { resistance_defensiveness: { weight: 0.5 }, engagement_intensity: { weight: -0.3 } },
  deepen_topic: { curiosity_bias: { weight: 0.6 }, engagement_intensity: { weight: 0.7 }, emotional_openness: { weight: 0.4 } },
};

export const EMERGENCE_MONITOR_CONFIGS: Record<EmergenceType, Omit<EmergenceMonitor, "lastTriggeredAt">> = {
  novel_behavior_pattern: {
    monitorType: "novel_behavior_pattern",
    isActive: true,
    sensitivity: 0.7,
    cooldownMs: 3600000,
    triggerConditions: [{ conditionType: "threshold", parameters: { noveltyScore: 0.7 }, weight: 1.0 }],
  },
  feedback_loop_positive: {
    monitorType: "feedback_loop_positive",
    isActive: true,
    sensitivity: 0.6,
    cooldownMs: 7200000,
    triggerConditions: [{ conditionType: "pattern_match", parameters: { pattern: "escalation", minStrength: 0.6 }, weight: 1.0 }],
  },
  feedback_loop_negative: {
    monitorType: "feedback_loop_negative",
    isActive: true,
    sensitivity: 0.6,
    cooldownMs: 7200000,
    triggerConditions: [{ conditionType: "pattern_match", parameters: { pattern: "de_escalation", minStrength: 0.6 }, weight: 1.0 }],
  },
  over_engagement: {
    monitorType: "over_engagement",
    isActive: true,
    sensitivity: 0.75,
    cooldownMs: 1800000,
    triggerConditions: [{ conditionType: "threshold", parameters: { engagement_intensity: 85 }, weight: 1.0 }],
  },
  withdrawal_spiral: {
    monitorType: "withdrawal_spiral",
    isActive: true,
    sensitivity: 0.7,
    cooldownMs: 3600000,
    triggerConditions: [
      { conditionType: "threshold", parameters: { approach_withdrawal: -60 }, weight: 0.6 },
      { conditionType: "rate_of_change", parameters: { field: "approach_withdrawal", rate: -5, period: 3600000 }, weight: 0.4 },
    ],
  },
  personality_drift: {
    monitorType: "personality_drift",
    isActive: true,
    sensitivity: 0.8,
    cooldownMs: 86400000,
    triggerConditions: [{ conditionType: "threshold", parameters: { totalDrift: 25 }, weight: 1.0 }],
  },
  attachment_shift: {
    monitorType: "attachment_shift",
    isActive: true,
    sensitivity: 0.75,
    cooldownMs: 43200000,
    triggerConditions: [{ conditionType: "rate_of_change", parameters: { tendency: "attachment_drift", rate: 10, period: 86400000 }, weight: 1.0 }],
  },
  defense_escalation: {
    monitorType: "defense_escalation",
    isActive: true,
    sensitivity: 0.7,
    cooldownMs: 3600000,
    triggerConditions: [{ conditionType: "threshold", parameters: { resistance_defensiveness: 75 }, weight: 1.0 }],
  },
  trust_collapse: {
    monitorType: "trust_collapse",
    isActive: true,
    sensitivity: 0.9,
    cooldownMs: 7200000,
    triggerConditions: [{ conditionType: "rate_of_change", parameters: { tendency: "trust_inertia", rate: -20, period: 3600000 }, weight: 1.0 }],
  },
  trust_breakthrough: {
    monitorType: "trust_breakthrough",
    isActive: true,
    sensitivity: 0.8,
    cooldownMs: 7200000,
    triggerConditions: [{ conditionType: "rate_of_change", parameters: { tendency: "trust_inertia", rate: 15, period: 3600000 }, weight: 1.0 }],
  },
  emotional_flooding: {
    monitorType: "emotional_flooding",
    isActive: true,
    sensitivity: 0.85,
    cooldownMs: 1800000,
    triggerConditions: [{ conditionType: "threshold", parameters: { emotional_arousal: 85, fatigue_emotional: 70 }, weight: 1.0 }],
  },
  emotional_numbing: {
    monitorType: "emotional_numbing",
    isActive: true,
    sensitivity: 0.75,
    cooldownMs: 7200000,
    triggerConditions: [{ conditionType: "threshold", parameters: { emotional_dampening: 70, emotional_openness: 15 }, weight: 1.0 }],
  },
  pattern_crystallization: {
    monitorType: "pattern_crystallization",
    isActive: true,
    sensitivity: 0.7,
    cooldownMs: 86400000,
    triggerConditions: [{ conditionType: "pattern_match", parameters: { patternStrength: 0.9, observationCount: 10 }, weight: 1.0 }],
  },
  pattern_dissolution: {
    monitorType: "pattern_dissolution",
    isActive: true,
    sensitivity: 0.65,
    cooldownMs: 86400000,
    triggerConditions: [{ conditionType: "rate_of_change", parameters: { patternStrength: -0.3, period: 604800000 }, weight: 1.0 }],
  },
};
