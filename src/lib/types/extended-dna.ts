export type DNALayer = "personality" | "cognitive" | "emotional_regulation" | "neuro_behavioral";

export type PersonalityTrait =
  | "social_engagement"
  | "empathy_depth"
  | "assertiveness"
  | "risk_tolerance"
  | "openness"
  | "conscientiousness"
  | "agreeableness"
  | "emotional_stability";

export type CognitiveTrait =
  | "attention_stability"
  | "focus_persistence"
  | "memory_recall_strength"
  | "decision_latency"
  | "cognitive_load_tolerance"
  | "analytical_depth"
  | "creative_flexibility"
  | "learning_speed"
  | "pattern_recognition"
  | "abstract_reasoning";

export type EmotionalRegulationTrait =
  | "emotional_intensity"
  | "stress_sensitivity"
  | "recovery_speed"
  | "mood_volatility"
  | "emotional_awareness"
  | "affect_regulation"
  | "distress_tolerance"
  | "positive_affect_capacity";

export type NeuroBehavioralTrait =
  | "trigger_sensitivity"
  | "avoidance_tendency"
  | "hyperfocus_probability"
  | "rumination_loops"
  | "impulse_modulation"
  | "sensory_sensitivity"
  | "routine_dependence"
  | "novelty_seeking"
  | "reward_sensitivity"
  | "inhibition_control";

export type ExtendedTraitKey =
  | PersonalityTrait
  | CognitiveTrait
  | EmotionalRegulationTrait
  | NeuroBehavioralTrait;

export interface TriggerCondition {
  type: "emotional_state" | "stress_level" | "interaction_type" | "context" | "time_based" | "memory_recall";
  operator: "gt" | "lt" | "eq" | "between" | "contains";
  value: number | string | [number, number];
  description?: string;
}

export interface ExtendedDNATrait {
  id: string;
  characterId: string;
  layer: DNALayer;
  traitKey: ExtendedTraitKey | string;
  traitValue: number;
  influenceStrength: number;
  resistance: number;
  volatility: number;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  minValue: number;
  maxValue: number;
  baselineValue: number;
  currentModifier: number;
  triggerConditions: TriggerCondition[];
  decayRate: number;
  reinforcementMultiplier: number;
  lastDecayAt: string | null;
  lastReinforcementAt: string | null;
  label: string;
  description: string;
  opposites: [string, string];
  safetyFlags: SafetyFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface SafetyFlag {
  type: "non_medical" | "simulation_only" | "reversible" | "educational";
  message: string;
}

export interface TraitModifier {
  id: string;
  characterId: string;
  traitId: string;
  modifierType: "temporary" | "permanent" | "conditional" | "profile_based";
  value: number;
  source: "behavioral_profile" | "interaction" | "memory" | "manual" | "decay" | "stress_response";
  sourceReferenceId: string | null;
  expiresAt: string | null;
  conditions: TriggerCondition[];
  isActive: boolean;
  createdAt: string;
}

export type BehavioralProfileType =
  | "high_anxiety_response"
  | "attention_volatility"
  | "trauma_inspired_sensitivity"
  | "hyperfocus_burnout_cycle"
  | "high_empathy_overwhelm"
  | "sensory_processing_variant"
  | "perfectionism_pattern"
  | "avoidant_coping"
  | "hypervigilance"
  | "emotional_dysregulation"
  | "custom";

export interface BehavioralProfile {
  id: string;
  type: BehavioralProfileType;
  name: string;
  description: string;
  safetyDisclaimer: string;
  traitAdjustments: TraitAdjustment[];
  triggerPatterns: TriggerPattern[];
  copingBehaviors: CopingBehavior[];
  isReversible: boolean;
  isNonMedical: boolean;
  applicationMode: "gradual" | "immediate";
  createdAt: string;
}

export interface TraitAdjustment {
  traitKey: ExtendedTraitKey | string;
  layer: DNALayer;
  adjustmentType: "absolute" | "relative" | "range_shift";
  value: number;
  volatilityModifier?: number;
  resistanceModifier?: number;
}

export interface TriggerPattern {
  name: string;
  description: string;
  conditions: TriggerCondition[];
  responses: TriggerResponse[];
  cooldownMs: number;
}

export interface TriggerResponse {
  type: "trait_shift" | "behavior_activation" | "emotional_cascade" | "avoidance";
  targetTraitKey?: ExtendedTraitKey | string;
  magnitude: number;
  duration: "momentary" | "short_term" | "persistent";
  description: string;
}

export interface CopingBehavior {
  name: string;
  type: "adaptive" | "maladaptive" | "neutral";
  activationThreshold: number;
  traitKey: ExtendedTraitKey | string;
  effectOnTraits: Array<{
    traitKey: ExtendedTraitKey | string;
    effect: number;
    duration: number;
  }>;
  description: string;
}

export interface CharacterBehavioralState {
  characterId: string;
  activeProfiles: string[];
  currentStressLevel: number;
  currentEmotionalState: EmotionalStateSnapshot;
  recentTriggers: RecentTrigger[];
  activeModifiers: TraitModifier[];
  copingInProgress: string[];
  lastStateUpdate: string;
}

export interface EmotionalStateSnapshot {
  primary: string;
  intensity: number;
  valence: number;
  arousal: number;
  dominance: number;
  secondary: string[];
  stability: number;
}

export interface RecentTrigger {
  triggerId: string;
  triggerType: string;
  occurredAt: string;
  intensity: number;
  resolved: boolean;
  responsesTaken: string[];
}

export interface TraitEvolutionEvent {
  id: string;
  characterId: string;
  traitId: string;
  eventType: "decay" | "reinforcement" | "trigger_response" | "profile_application" | "stress_shift" | "coping_effect";
  previousValue: number;
  newValue: number;
  modifier: number;
  source: string;
  sourceReferenceId: string | null;
  triggerConditionsMet: TriggerCondition[];
  reasoningData: EvolutionReasoning;
  isReversible: boolean;
  reversedAt: string | null;
  createdAt: string;
}

export interface EvolutionReasoning {
  primaryFactors: string[];
  contributingTraits: Array<{
    traitKey: string;
    value: number;
    contribution: number;
  }>;
  memoriesReferenced: string[];
  safetyChecks: SafetyCheckResult[];
  confidenceScore: number;
  alternativeOutcomes?: Array<{
    outcome: string;
    probability: number;
  }>;
}

export interface SafetyCheckResult {
  checkType: "boundary" | "medical_language" | "harmful_pattern" | "reversibility";
  passed: boolean;
  message: string;
  action?: "blocked" | "modified" | "flagged";
}

export interface DNAExplainability {
  characterId: string;
  actionId: string;
  timestamp: string;
  behaviorExplained: string;
  contributingLayers: LayerContribution[];
  traitInfluences: TraitInfluence[];
  activeProfileEffects: ProfileEffect[];
  triggerChain: TriggerChainLink[];
  memoryInfluences: MemoryInfluenceDetail[];
  safetyBoundaries: SafetyBoundary[];
  simulationDisclaimer: string;
}

export interface LayerContribution {
  layer: DNALayer;
  overallInfluence: number;
  dominantTraits: string[];
  description: string;
}

export interface TraitInfluence {
  traitKey: string;
  layer: DNALayer;
  currentValue: number;
  influenceWeight: number;
  contribution: number;
  modifiersActive: string[];
  reasoning: string;
}

export interface ProfileEffect {
  profileId: string;
  profileType: BehavioralProfileType;
  effectDescription: string;
  traitsAffected: string[];
  intensity: number;
}

export interface TriggerChainLink {
  order: number;
  triggerType: string;
  triggerCondition: string;
  response: string;
  traitAffected: string;
  magnitude: number;
}

export interface MemoryInfluenceDetail {
  memoryId: string;
  memoryType: string;
  relevance: number;
  emotionalWeight: number;
  traitsInfluenced: string[];
  excerpt?: string;
}

export interface SafetyBoundary {
  boundaryType: string;
  description: string;
  status: "enforced" | "approaching" | "clear";
  action?: string;
}

export const DNA_LAYER_DEFINITIONS: Record<DNALayer, {
  name: string;
  description: string;
  color: string;
  icon: string;
}> = {
  personality: {
    name: "Personality",
    description: "Core personality traits governing social behavior and fundamental dispositions",
    color: "#8b5cf6",
    icon: "user",
  },
  cognitive: {
    name: "Cognitive",
    description: "Mental processing patterns including attention, memory, and decision-making",
    color: "#f59e0b",
    icon: "brain",
  },
  emotional_regulation: {
    name: "Emotional Regulation",
    description: "Emotional processing, intensity control, and stress response patterns",
    color: "#ef4444",
    icon: "heart",
  },
  neuro_behavioral: {
    name: "Neuro-Behavioral",
    description: "Behavioral modifiers affecting impulse control, sensitivity, and response patterns",
    color: "#06b6d4",
    icon: "zap",
  },
};

export const EXTENDED_TRAIT_DEFINITIONS: ExtendedDNATrait[] = [
  {
    id: "",
    characterId: "",
    layer: "personality",
    traitKey: "social_engagement",
    traitValue: 50,
    influenceStrength: 1.0,
    resistance: 0.5,
    volatility: 0.2,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.01,
    reinforcementMultiplier: 1.0,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Social Engagement",
    description: "Tendency to seek and enjoy social interactions",
    opposites: ["Solitary", "Gregarious"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "personality",
    traitKey: "empathy_depth",
    traitValue: 50,
    influenceStrength: 1.2,
    resistance: 0.6,
    volatility: 0.3,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.005,
    reinforcementMultiplier: 1.2,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Empathy Depth",
    description: "Capacity to understand and share others' emotional states",
    opposites: ["Detached", "Deeply Empathic"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "personality",
    traitKey: "assertiveness",
    traitValue: 50,
    influenceStrength: 1.0,
    resistance: 0.4,
    volatility: 0.25,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.01,
    reinforcementMultiplier: 1.0,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Assertiveness",
    description: "Confidence in expressing needs and boundaries",
    opposites: ["Yielding", "Assertive"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "personality",
    traitKey: "risk_tolerance",
    traitValue: 50,
    influenceStrength: 1.0,
    resistance: 0.5,
    volatility: 0.3,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.01,
    reinforcementMultiplier: 1.0,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Risk Tolerance",
    description: "Willingness to take risks and face uncertainty",
    opposites: ["Risk-Averse", "Risk-Seeking"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "cognitive",
    traitKey: "attention_stability",
    traitValue: 50,
    influenceStrength: 1.3,
    resistance: 0.4,
    volatility: 0.4,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [
      { type: "stress_level", operator: "gt", value: 70, description: "Decreases under high stress" },
    ],
    decayRate: 0.02,
    reinforcementMultiplier: 0.8,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Attention Stability",
    description: "Ability to maintain focus without external support",
    opposites: ["Scattered", "Laser-Focused"],
    safetyFlags: [
      { type: "non_medical", message: "Simulated behavioral pattern, not ADHD or any diagnosis" },
      { type: "simulation_only", message: "For character simulation purposes only" },
    ],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "cognitive",
    traitKey: "focus_persistence",
    traitValue: 50,
    influenceStrength: 1.2,
    resistance: 0.5,
    volatility: 0.35,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.015,
    reinforcementMultiplier: 1.0,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Focus Persistence",
    description: "Duration of sustained attention on tasks",
    opposites: ["Brief Focus", "Extended Focus"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "cognitive",
    traitKey: "memory_recall_strength",
    traitValue: 50,
    influenceStrength: 1.0,
    resistance: 0.6,
    volatility: 0.2,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.01,
    reinforcementMultiplier: 1.1,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Memory Recall",
    description: "Ease of accessing stored information",
    opposites: ["Foggy Recall", "Sharp Recall"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "cognitive",
    traitKey: "decision_latency",
    traitValue: 50,
    influenceStrength: 1.0,
    resistance: 0.4,
    volatility: 0.3,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [
      { type: "stress_level", operator: "gt", value: 60, description: "Increases under stress" },
    ],
    decayRate: 0.01,
    reinforcementMultiplier: 1.0,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Decision Speed",
    description: "Time needed to make decisions (low = fast, high = deliberate)",
    opposites: ["Snap Decisions", "Careful Deliberation"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "cognitive",
    traitKey: "cognitive_load_tolerance",
    traitValue: 50,
    influenceStrength: 1.1,
    resistance: 0.5,
    volatility: 0.3,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.02,
    reinforcementMultiplier: 0.9,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Cognitive Load Tolerance",
    description: "Capacity to handle multiple simultaneous mental demands",
    opposites: ["Easily Overwhelmed", "High Capacity"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "emotional_regulation",
    traitKey: "emotional_intensity",
    traitValue: 50,
    influenceStrength: 1.4,
    resistance: 0.4,
    volatility: 0.5,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.02,
    reinforcementMultiplier: 1.2,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Emotional Intensity",
    description: "Strength and depth of emotional experiences",
    opposites: ["Muted", "Intense"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "emotional_regulation",
    traitKey: "stress_sensitivity",
    traitValue: 50,
    influenceStrength: 1.3,
    resistance: 0.3,
    volatility: 0.4,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.015,
    reinforcementMultiplier: 1.1,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Stress Sensitivity",
    description: "Reactivity to stressful situations",
    opposites: ["Stress-Resistant", "Stress-Sensitive"],
    safetyFlags: [
      { type: "non_medical", message: "Simulated stress response, not anxiety disorder" },
      { type: "reversible", message: "Can be adjusted at any time" },
    ],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "emotional_regulation",
    traitKey: "recovery_speed",
    traitValue: 50,
    influenceStrength: 1.2,
    resistance: 0.5,
    volatility: 0.3,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.01,
    reinforcementMultiplier: 1.0,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Emotional Recovery",
    description: "Speed of returning to baseline after emotional events",
    opposites: ["Slow Recovery", "Quick Recovery"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "emotional_regulation",
    traitKey: "mood_volatility",
    traitValue: 50,
    influenceStrength: 1.3,
    resistance: 0.4,
    volatility: 0.6,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [],
    decayRate: 0.02,
    reinforcementMultiplier: 1.0,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Mood Stability",
    description: "Consistency of emotional states over time (low = stable, high = volatile)",
    opposites: ["Steady Mood", "Fluctuating Mood"],
    safetyFlags: [
      { type: "non_medical", message: "Simulated mood patterns, not bipolar or any diagnosis" },
      { type: "simulation_only", message: "For character simulation purposes only" },
    ],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "neuro_behavioral",
    traitKey: "trigger_sensitivity",
    traitValue: 50,
    influenceStrength: 1.4,
    resistance: 0.3,
    volatility: 0.5,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [
      { type: "emotional_state", operator: "contains", value: "anxious", description: "Heightened when anxious" },
    ],
    decayRate: 0.01,
    reinforcementMultiplier: 1.3,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Trigger Sensitivity",
    description: "Reactivity to specific stimuli that provoke responses",
    opposites: ["Low Reactivity", "High Reactivity"],
    safetyFlags: [
      { type: "non_medical", message: "Simulated sensitivity pattern, not PTSD or any diagnosis" },
      { type: "simulation_only", message: "For fictional character simulation only" },
    ],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "neuro_behavioral",
    traitKey: "avoidance_tendency",
    traitValue: 50,
    influenceStrength: 1.2,
    resistance: 0.4,
    volatility: 0.4,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [
      { type: "stress_level", operator: "gt", value: 65, description: "Increases under stress" },
    ],
    decayRate: 0.015,
    reinforcementMultiplier: 1.2,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Avoidance Tendency",
    description: "Likelihood to avoid uncomfortable situations",
    opposites: ["Approach-Oriented", "Avoidance-Oriented"],
    safetyFlags: [{ type: "non_medical", message: "Behavioral pattern, not a diagnosis" }],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "neuro_behavioral",
    traitKey: "hyperfocus_probability",
    traitValue: 50,
    influenceStrength: 1.3,
    resistance: 0.5,
    volatility: 0.45,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [
      { type: "context", operator: "contains", value: "interesting", description: "Higher with engaging topics" },
    ],
    decayRate: 0.02,
    reinforcementMultiplier: 1.1,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Hyperfocus Tendency",
    description: "Likelihood of entering deep, absorbing focus states",
    opposites: ["Distributed Attention", "Hyperfocus-Prone"],
    safetyFlags: [
      { type: "non_medical", message: "Simulated focus pattern, not ADHD hyperfocus" },
      { type: "simulation_only", message: "For character simulation purposes only" },
    ],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "neuro_behavioral",
    traitKey: "rumination_loops",
    traitValue: 50,
    influenceStrength: 1.2,
    resistance: 0.3,
    volatility: 0.5,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [
      { type: "emotional_state", operator: "contains", value: "worried", description: "Increases when worried" },
    ],
    decayRate: 0.02,
    reinforcementMultiplier: 1.3,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Rumination",
    description: "Tendency for repetitive, circular thinking patterns",
    opposites: ["Moves On Quickly", "Ruminates"],
    safetyFlags: [
      { type: "non_medical", message: "Simulated thought pattern, not OCD or anxiety disorder" },
      { type: "reversible", message: "Can be adjusted at any time" },
    ],
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "",
    characterId: "",
    layer: "neuro_behavioral",
    traitKey: "impulse_modulation",
    traitValue: 50,
    influenceStrength: 1.3,
    resistance: 0.4,
    volatility: 0.4,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    minValue: 0,
    maxValue: 100,
    baselineValue: 50,
    currentModifier: 0,
    triggerConditions: [
      { type: "emotional_state", operator: "contains", value: "excited", description: "Decreases when excited" },
    ],
    decayRate: 0.015,
    reinforcementMultiplier: 1.0,
    lastDecayAt: null,
    lastReinforcementAt: null,
    label: "Impulse Control",
    description: "Ability to regulate spontaneous urges (low = impulsive, high = controlled)",
    opposites: ["Impulsive", "Controlled"],
    safetyFlags: [
      { type: "non_medical", message: "Behavioral pattern, not impulse control disorder" },
      { type: "simulation_only", message: "For character simulation purposes only" },
    ],
    createdAt: "",
    updatedAt: "",
  },
];

export const BEHAVIORAL_PROFILES: BehavioralProfile[] = [
  {
    id: "profile_high_anxiety",
    type: "high_anxiety_response",
    name: "High Anxiety Response Pattern",
    description: "Character exhibits heightened worry, vigilance, and stress reactivity. Not a clinical diagnosis.",
    safetyDisclaimer: "This is a SIMULATED behavioral pattern for fictional characters. It does NOT represent, diagnose, or simulate any real anxiety disorder. For entertainment and creative purposes only.",
    traitAdjustments: [
      { traitKey: "stress_sensitivity", layer: "emotional_regulation", adjustmentType: "relative", value: 20, volatilityModifier: 0.1 },
      { traitKey: "trigger_sensitivity", layer: "neuro_behavioral", adjustmentType: "relative", value: 15 },
      { traitKey: "avoidance_tendency", layer: "neuro_behavioral", adjustmentType: "relative", value: 15 },
      { traitKey: "rumination_loops", layer: "neuro_behavioral", adjustmentType: "relative", value: 20 },
      { traitKey: "recovery_speed", layer: "emotional_regulation", adjustmentType: "relative", value: -15 },
    ],
    triggerPatterns: [
      {
        name: "Uncertainty Response",
        description: "Heightened stress when facing uncertain outcomes",
        conditions: [{ type: "context", operator: "contains", value: "uncertain" }],
        responses: [
          { type: "trait_shift", targetTraitKey: "stress_sensitivity", magnitude: 10, duration: "short_term", description: "Temporary increase in stress sensitivity" },
        ],
        cooldownMs: 300000,
      },
    ],
    copingBehaviors: [
      {
        name: "Reassurance Seeking",
        type: "neutral",
        activationThreshold: 70,
        traitKey: "stress_sensitivity",
        effectOnTraits: [{ traitKey: "stress_sensitivity", effect: -5, duration: 60000 }],
        description: "Seeks validation to reduce anxiety",
      },
    ],
    isReversible: true,
    isNonMedical: true,
    applicationMode: "gradual",
    createdAt: "",
  },
  {
    id: "profile_attention_volatility",
    type: "attention_volatility",
    name: "Attention Volatility Pattern",
    description: "Character has variable focus with periods of both distraction and intense concentration. Not a clinical diagnosis.",
    safetyDisclaimer: "This is a SIMULATED behavioral pattern for fictional characters. It does NOT represent, diagnose, or simulate ADHD or any attention disorder. For entertainment and creative purposes only.",
    traitAdjustments: [
      { traitKey: "attention_stability", layer: "cognitive", adjustmentType: "relative", value: -20, volatilityModifier: 0.2 },
      { traitKey: "focus_persistence", layer: "cognitive", adjustmentType: "relative", value: -15 },
      { traitKey: "hyperfocus_probability", layer: "neuro_behavioral", adjustmentType: "relative", value: 25 },
      { traitKey: "impulse_modulation", layer: "neuro_behavioral", adjustmentType: "relative", value: -15 },
      { traitKey: "novelty_seeking", layer: "neuro_behavioral", adjustmentType: "relative", value: 20 },
    ],
    triggerPatterns: [
      {
        name: "Interest Spike",
        description: "Sudden deep engagement when topic is highly interesting",
        conditions: [{ type: "context", operator: "contains", value: "fascinating" }],
        responses: [
          { type: "behavior_activation", magnitude: 80, duration: "persistent", description: "Enters hyperfocus state" },
        ],
        cooldownMs: 600000,
      },
    ],
    copingBehaviors: [
      {
        name: "Task Switching",
        type: "neutral",
        activationThreshold: 60,
        traitKey: "attention_stability",
        effectOnTraits: [{ traitKey: "cognitive_load_tolerance", effect: -10, duration: 30000 }],
        description: "Switches between tasks to maintain engagement",
      },
    ],
    isReversible: true,
    isNonMedical: true,
    applicationMode: "gradual",
    createdAt: "",
  },
  {
    id: "profile_trauma_sensitivity",
    type: "trauma_inspired_sensitivity",
    name: "Heightened Sensitivity Pattern",
    description: "Character shows increased vigilance and emotional reactivity based on past experiences. Not a clinical diagnosis.",
    safetyDisclaimer: "This is a SIMULATED behavioral pattern for fictional characters. It does NOT represent, diagnose, or simulate PTSD or any trauma-related condition. For entertainment and creative purposes only.",
    traitAdjustments: [
      { traitKey: "trigger_sensitivity", layer: "neuro_behavioral", adjustmentType: "relative", value: 30, volatilityModifier: 0.15 },
      { traitKey: "emotional_intensity", layer: "emotional_regulation", adjustmentType: "relative", value: 20 },
      { traitKey: "avoidance_tendency", layer: "neuro_behavioral", adjustmentType: "relative", value: 25 },
      { traitKey: "memory_recall_strength", layer: "cognitive", adjustmentType: "range_shift", value: -10, volatilityModifier: 0.2 },
      { traitKey: "stress_sensitivity", layer: "emotional_regulation", adjustmentType: "relative", value: 20 },
    ],
    triggerPatterns: [
      {
        name: "Memory Trigger",
        description: "Strong emotional response when reminded of past events",
        conditions: [{ type: "memory_recall", operator: "contains", value: "traumatic" }],
        responses: [
          { type: "emotional_cascade", magnitude: 60, duration: "momentary", description: "Intense emotional response" },
          { type: "avoidance", magnitude: 40, duration: "short_term", description: "Tendency to withdraw" },
        ],
        cooldownMs: 600000,
      },
    ],
    copingBehaviors: [
      {
        name: "Grounding",
        type: "adaptive",
        activationThreshold: 75,
        traitKey: "trigger_sensitivity",
        effectOnTraits: [
          { traitKey: "emotional_intensity", effect: -20, duration: 120000 },
          { traitKey: "stress_sensitivity", effect: -15, duration: 120000 },
        ],
        description: "Uses grounding techniques to manage distress",
      },
    ],
    isReversible: true,
    isNonMedical: true,
    applicationMode: "gradual",
    createdAt: "",
  },
  {
    id: "profile_hyperfocus_burnout",
    type: "hyperfocus_burnout_cycle",
    name: "Intensity Cycle Pattern",
    description: "Character alternates between periods of intense productivity and exhaustion. Not a clinical diagnosis.",
    safetyDisclaimer: "This is a SIMULATED behavioral pattern for fictional characters. It does NOT represent any clinical condition. For entertainment and creative purposes only.",
    traitAdjustments: [
      { traitKey: "hyperfocus_probability", layer: "neuro_behavioral", adjustmentType: "relative", value: 30 },
      { traitKey: "cognitive_load_tolerance", layer: "cognitive", adjustmentType: "relative", value: -10, volatilityModifier: 0.3 },
      { traitKey: "recovery_speed", layer: "emotional_regulation", adjustmentType: "relative", value: -20 },
      { traitKey: "mood_volatility", layer: "emotional_regulation", adjustmentType: "relative", value: 15 },
    ],
    triggerPatterns: [
      {
        name: "Burnout Onset",
        description: "Exhaustion following extended high-intensity period",
        conditions: [{ type: "time_based", operator: "gt", value: 14400000 }],
        responses: [
          { type: "trait_shift", targetTraitKey: "cognitive_load_tolerance", magnitude: -30, duration: "persistent", description: "Cognitive capacity drops" },
        ],
        cooldownMs: 86400000,
      },
    ],
    copingBehaviors: [
      {
        name: "Complete Withdrawal",
        type: "maladaptive",
        activationThreshold: 80,
        traitKey: "cognitive_load_tolerance",
        effectOnTraits: [{ traitKey: "social_engagement", effect: -40, duration: 86400000 }],
        description: "Withdraws completely to recover",
      },
    ],
    isReversible: true,
    isNonMedical: true,
    applicationMode: "gradual",
    createdAt: "",
  },
];

export const SAFETY_RULES = {
  prohibitedTerms: [
    "diagnosis", "disorder", "syndrome", "condition", "mental illness",
    "clinical", "psychiatric", "pathological", "treatment", "therapy",
    "medication", "prescription", "DSM", "ICD", "symptoms",
  ],
  requiredDisclaimers: [
    "This is a simulated behavioral pattern for fictional characters only.",
    "This does not represent any real medical or psychological condition.",
    "For entertainment and creative purposes only.",
  ],
  maxVolatility: 0.8,
  maxInfluenceStrength: 2.0,
  minRecoverySpeed: 10,
  mandatorySafetyFlags: ["non_medical", "simulation_only"],
} as const;

export interface ExtendedDNATraitsInput {
  personality?: Partial<ExtendedDNATrait>[];
  cognitive?: Partial<ExtendedDNATrait>[];
  emotional_regulation?: Partial<ExtendedDNATrait>[];
  neuro_behavioral?: Partial<ExtendedDNATrait>[];
}
