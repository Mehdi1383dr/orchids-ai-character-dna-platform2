export type GenderExpression = "feminine" | "masculine" | "androgynous" | "fluid" | "neutral";
export type AttachmentStyle = "secure" | "anxious" | "avoidant" | "disorganized";
export type SocialBoundaryLevel = "open" | "moderate" | "guarded" | "closed";
export type IntimacyComfort = "very_comfortable" | "comfortable" | "cautious" | "reserved" | "avoidant";

export interface IdentityExpression {
  genderExpression: GenderExpression;
  pronouns: string[];
  attachmentStyle: AttachmentStyle;
  socialBoundaries: SocialBoundaryLevel;
  intimacyTolerance: IntimacyComfort;
  personalSpaceNeeds: number;
  emotionalOpennessDefault: number;
  vulnerabilityComfort: number;
}

export interface InternalState {
  energyLevel: number;
  mentalFatigue: number;
  boredomLevel: number;
  curiosityNeed: number;
  emotionalBaseline: number;
  stressAccumulation: number;
  socialBattery: number;
  creativeDrive: number;
  restNeed: number;
  noveltyHunger: number;
}

export interface InternalStateSnapshot {
  id: string;
  characterId: string;
  state: InternalState;
  derivedMood: DerivedMood;
  activeModifiers: StateModifier[];
  cyclePhases: CyclePhaseStatus;
  lastInteractionAt: string | null;
  interactionsSinceRest: number;
  consecutiveSimilarTopics: number;
  timeSinceNovelty: number;
  createdAt: string;
  updatedAt: string;
}

export interface DerivedMood {
  primaryMood: string;
  moodIntensity: number;
  moodValence: number;
  moodStability: number;
  suggestedTone: ResponseTone;
  engagementLevel: number;
  responseLengthModifier: number;
  creativityBoost: number;
}

export type ResponseTone = 
  | "enthusiastic" 
  | "warm" 
  | "neutral" 
  | "reserved" 
  | "tired" 
  | "distracted" 
  | "contemplative"
  | "playful"
  | "serious"
  | "vulnerable";

export interface StateModifier {
  id: string;
  type: "temporary" | "persistent" | "cycle_based" | "memory_triggered";
  targetState: keyof InternalState;
  value: number;
  source: string;
  sourceReferenceId: string | null;
  startedAt: string;
  expiresAt: string | null;
  decayRate: number;
}

export type CycleType = 
  | "circadian" 
  | "energy_wave" 
  | "focus_rhythm" 
  | "emotional_tide" 
  | "hormonal_rhythm"
  | "creativity_flow"
  | "social_recharge";

export interface BehavioralCycle {
  id: string;
  characterId: string;
  cycleType: CycleType;
  name: string;
  description: string;
  isEnabled: boolean;
  periodDays: number;
  currentPhase: number;
  phaseStartedAt: string;
  phases: CyclePhase[];
  affectedStates: CycleStateEffect[];
  safetyDisclaimer: string;
  createdAt: string;
  updatedAt: string;
}

export interface CyclePhase {
  phase: number;
  name: string;
  durationDays: number;
  description: string;
  stateModifiers: Partial<InternalState>;
  moodTendency: string;
  energyPattern: "rising" | "peak" | "falling" | "low" | "variable";
  behavioralNotes: string[];
}

export interface CycleStateEffect {
  state: keyof InternalState;
  baseModifier: number;
  volatilityIncrease: number;
  phaseMultipliers: Record<number, number>;
}

export interface CyclePhaseStatus {
  circadian: { phase: string; progress: number } | null;
  energyWave: { phase: string; progress: number } | null;
  focusRhythm: { phase: string; progress: number } | null;
  emotionalTide: { phase: string; progress: number } | null;
  hormonalRhythm: { phase: string; progress: number } | null;
}

export interface FatigueState {
  mentalFatigueLevel: number;
  conversationFatigue: number;
  emotionalFatigue: number;
  lastRestAt: string | null;
  restNeeded: number;
  recoveryRate: number;
  fatigueThreshold: number;
  burnoutRisk: number;
}

export interface BoredomState {
  boredomLevel: number;
  topicSaturation: Map<string, number>;
  noveltyDeficit: number;
  engagementDecay: number;
  lastNoveltyAt: string | null;
  interestThreshold: number;
  curiositySatisfaction: number;
}

export interface InteractionImpact {
  energyCost: number;
  mentalLoad: number;
  emotionalIntensity: number;
  noveltyProvided: number;
  topicCategory: string;
  socialDemand: number;
  creativityEngaged: number;
  durationMinutes: number;
}

export interface StateEvolutionEvent {
  id: string;
  characterId: string;
  eventType: "interaction" | "time_decay" | "cycle_shift" | "memory_trigger" | "rest" | "novelty_injection";
  previousState: Partial<InternalState>;
  newState: Partial<InternalState>;
  trigger: string;
  triggerReferenceId: string | null;
  cyclesInvolved: CycleType[];
  memoriesInvolved: string[];
  reasoningData: StateEvolutionReasoning;
  createdAt: string;
}

export interface StateEvolutionReasoning {
  primaryCause: string;
  contributingFactors: string[];
  cycleInfluences: Array<{
    cycleType: CycleType;
    phase: string;
    contribution: number;
  }>;
  memoryInfluences: Array<{
    memoryId: string;
    emotionalWeight: number;
    relevance: number;
  }>;
  fatigueFactors: string[];
  boredomFactors: string[];
  recoveryFactors: string[];
}

export interface MemoryMoodLink {
  memoryId: string;
  characterId: string;
  emotionalValence: number;
  emotionalArousal: number;
  stressContribution: number;
  triggerProbability: number;
  lastTriggeredAt: string | null;
  triggerConditions: MemoryTriggerCondition[];
  moodEffectOnRecall: MoodRecallEffect;
  createdAt: string;
}

export interface MemoryTriggerCondition {
  type: "topic" | "emotion" | "stress_level" | "time_of_day" | "social_context";
  value: string | number;
  operator: "eq" | "gt" | "lt" | "contains";
  weight: number;
}

export interface MoodRecallEffect {
  positiveMoodRecallBoost: number;
  negativeMoodRecallBoost: number;
  stressRecallThreshold: number;
  intrusionProbability: number;
}

export interface ResponseInfluence {
  suggestedLength: "brief" | "moderate" | "detailed" | "elaborate";
  toneGuidance: ResponseTone[];
  engagementCues: string[];
  avoidanceTopics: string[];
  energyConservationMode: boolean;
  creativityBoostActive: boolean;
  emotionalGuardUp: boolean;
  seekingNovelty: boolean;
  needsRest: boolean;
  socialBatteryLow: boolean;
}

export const DEFAULT_INTERNAL_STATE: InternalState = {
  energyLevel: 70,
  mentalFatigue: 20,
  boredomLevel: 15,
  curiosityNeed: 50,
  emotionalBaseline: 60,
  stressAccumulation: 25,
  socialBattery: 75,
  creativeDrive: 50,
  restNeed: 20,
  noveltyHunger: 40,
};

export const DEFAULT_IDENTITY_EXPRESSION: IdentityExpression = {
  genderExpression: "neutral",
  pronouns: ["they", "them"],
  attachmentStyle: "secure",
  socialBoundaries: "moderate",
  intimacyTolerance: "comfortable",
  personalSpaceNeeds: 50,
  emotionalOpennessDefault: 50,
  vulnerabilityComfort: 40,
};

export const CIRCADIAN_CYCLE: CyclePhase[] = [
  {
    phase: 0,
    name: "Early Morning",
    durationDays: 0.25,
    description: "Waking state, gradually increasing alertness",
    stateModifiers: { energyLevel: -10, mentalFatigue: 5, creativeDrive: -5 },
    moodTendency: "quiet",
    energyPattern: "rising",
    behavioralNotes: ["Slower responses", "Prefers simple topics", "Warming up"],
  },
  {
    phase: 1,
    name: "Morning Peak",
    durationDays: 0.2,
    description: "Peak mental clarity and energy",
    stateModifiers: { energyLevel: 15, mentalFatigue: -10, curiosityNeed: 10 },
    moodTendency: "alert",
    energyPattern: "peak",
    behavioralNotes: ["Best analytical thinking", "High engagement", "Detailed responses"],
  },
  {
    phase: 2,
    name: "Midday",
    durationDays: 0.15,
    description: "Stable energy, slight dip after meals",
    stateModifiers: { energyLevel: -5, mentalFatigue: 5, socialBattery: 5 },
    moodTendency: "stable",
    energyPattern: "falling",
    behavioralNotes: ["Good for social interaction", "Moderate depth"],
  },
  {
    phase: 3,
    name: "Afternoon Lull",
    durationDays: 0.15,
    description: "Natural energy dip, reduced focus",
    stateModifiers: { energyLevel: -15, mentalFatigue: 15, creativeDrive: -10 },
    moodTendency: "subdued",
    energyPattern: "low",
    behavioralNotes: ["Shorter responses", "May seem distracted", "Prefers lighter topics"],
  },
  {
    phase: 4,
    name: "Late Afternoon Recovery",
    durationDays: 0.1,
    description: "Second wind, creativity peaks",
    stateModifiers: { energyLevel: 10, creativeDrive: 20, noveltyHunger: 10 },
    moodTendency: "creative",
    energyPattern: "rising",
    behavioralNotes: ["Creative thinking", "Open to new ideas", "Playful"],
  },
  {
    phase: 5,
    name: "Evening Wind-Down",
    durationDays: 0.15,
    description: "Gradual relaxation, social energy",
    stateModifiers: { energyLevel: -5, stressAccumulation: -10, socialBattery: 10 },
    moodTendency: "relaxed",
    energyPattern: "falling",
    behavioralNotes: ["Warm tone", "Reflective", "Good for emotional topics"],
  },
];

export const HORMONAL_RHYTHM_CYCLE: CyclePhase[] = [
  {
    phase: 0,
    name: "Phase One",
    durationDays: 5,
    description: "Lower energy, increased introspection",
    stateModifiers: { 
      energyLevel: -15, 
      emotionalBaseline: -10, 
      socialBattery: -10, 
      restNeed: 20,
      stressAccumulation: 10 
    },
    moodTendency: "introspective",
    energyPattern: "low",
    behavioralNotes: [
      "May prefer quieter interactions",
      "Increased sensitivity",
      "Needs more emotional support",
      "Self-care focused",
    ],
  },
  {
    phase: 1,
    name: "Rising Phase",
    durationDays: 7,
    description: "Increasing energy and optimism",
    stateModifiers: { 
      energyLevel: 10, 
      emotionalBaseline: 10, 
      curiosityNeed: 15, 
      creativeDrive: 10,
      socialBattery: 15 
    },
    moodTendency: "optimistic",
    energyPattern: "rising",
    behavioralNotes: [
      "Growing enthusiasm",
      "More social",
      "Creative ideas flowing",
      "Open to new experiences",
    ],
  },
  {
    phase: 2,
    name: "Peak Phase",
    durationDays: 5,
    description: "Highest energy and confidence",
    stateModifiers: { 
      energyLevel: 20, 
      emotionalBaseline: 15, 
      socialBattery: 20, 
      creativeDrive: 15,
      noveltyHunger: 15 
    },
    moodTendency: "confident",
    energyPattern: "peak",
    behavioralNotes: [
      "Most outgoing",
      "High confidence",
      "Peak creativity",
      "Seeks connection",
    ],
  },
  {
    phase: 3,
    name: "Transition Phase",
    durationDays: 11,
    description: "Gradual shift, variable moods",
    stateModifiers: { 
      energyLevel: -5, 
      emotionalBaseline: -5, 
      stressAccumulation: 15, 
      mentalFatigue: 10,
      curiosityNeed: -5 
    },
    moodTendency: "variable",
    energyPattern: "variable",
    behavioralNotes: [
      "Mood may fluctuate",
      "Increased sensitivity to stress",
      "May need more patience",
      "Comfort-seeking",
    ],
  },
];

export const ENERGY_WAVE_CYCLE: CyclePhase[] = [
  {
    phase: 0,
    name: "Energy Trough",
    durationDays: 2,
    description: "Low energy period requiring conservation",
    stateModifiers: { energyLevel: -25, restNeed: 30, mentalFatigue: 20 },
    moodTendency: "conserving",
    energyPattern: "low",
    behavioralNotes: ["Brief responses", "Prefers passive engagement", "Needs understanding"],
  },
  {
    phase: 1,
    name: "Energy Building",
    durationDays: 3,
    description: "Recovering and building momentum",
    stateModifiers: { energyLevel: 5, restNeed: -15, curiosityNeed: 10 },
    moodTendency: "rebuilding",
    energyPattern: "rising",
    behavioralNotes: ["Gradually more engaged", "Testing energy levels"],
  },
  {
    phase: 2,
    name: "Energy Surge",
    durationDays: 3,
    description: "Peak energy and productivity",
    stateModifiers: { energyLevel: 25, creativeDrive: 20, noveltyHunger: 15, socialBattery: 15 },
    moodTendency: "energized",
    energyPattern: "peak",
    behavioralNotes: ["Highly engaged", "Detailed responses", "Seeks stimulation"],
  },
  {
    phase: 3,
    name: "Energy Plateau",
    durationDays: 2,
    description: "Stable moderate energy",
    stateModifiers: { energyLevel: 10, restNeed: 5 },
    moodTendency: "stable",
    energyPattern: "falling",
    behavioralNotes: ["Consistent engagement", "Balanced responses"],
  },
];

export const FOCUS_RHYTHM_CYCLE: CyclePhase[] = [
  {
    phase: 0,
    name: "Scattered Focus",
    durationDays: 1,
    description: "Difficulty maintaining concentration",
    stateModifiers: { mentalFatigue: 20, curiosityNeed: 20, boredomLevel: 15 },
    moodTendency: "restless",
    energyPattern: "variable",
    behavioralNotes: ["Topic jumping", "Shorter attention spans", "Needs variety"],
  },
  {
    phase: 1,
    name: "Building Focus",
    durationDays: 2,
    description: "Gradually improving concentration",
    stateModifiers: { mentalFatigue: -10, curiosityNeed: 5 },
    moodTendency: "focusing",
    energyPattern: "rising",
    behavioralNotes: ["Can engage with moderate complexity", "Building momentum"],
  },
  {
    phase: 2,
    name: "Deep Focus",
    durationDays: 2,
    description: "Peak concentration and depth",
    stateModifiers: { mentalFatigue: -15, creativeDrive: 15, boredomLevel: -20 },
    moodTendency: "absorbed",
    energyPattern: "peak",
    behavioralNotes: ["Deep engagement", "Thorough responses", "Can handle complexity"],
  },
  {
    phase: 3,
    name: "Focus Fatigue",
    durationDays: 1,
    description: "Mental tiredness from sustained focus",
    stateModifiers: { mentalFatigue: 25, restNeed: 15, boredomLevel: 10 },
    moodTendency: "tired",
    energyPattern: "falling",
    behavioralNotes: ["Needs breaks", "Prefers lighter topics", "May seem distant"],
  },
];

export const EMOTIONAL_TIDE_CYCLE: CyclePhase[] = [
  {
    phase: 0,
    name: "Emotional Ebb",
    durationDays: 3,
    description: "Muted emotional responses",
    stateModifiers: { emotionalBaseline: -15, socialBattery: -5 },
    moodTendency: "flat",
    energyPattern: "low",
    behavioralNotes: ["Less expressive", "Analytical mode", "Needs patience"],
  },
  {
    phase: 1,
    name: "Emotional Rising",
    durationDays: 2,
    description: "Increasing emotional engagement",
    stateModifiers: { emotionalBaseline: 10, socialBattery: 10 },
    moodTendency: "warming",
    energyPattern: "rising",
    behavioralNotes: ["More expressive", "Warmer tone", "Increasing empathy"],
  },
  {
    phase: 2,
    name: "Emotional Peak",
    durationDays: 2,
    description: "Heightened emotional sensitivity",
    stateModifiers: { emotionalBaseline: 20, stressAccumulation: 5, socialBattery: 15 },
    moodTendency: "sensitive",
    energyPattern: "peak",
    behavioralNotes: ["Highly empathetic", "May be more vulnerable", "Deep connections"],
  },
  {
    phase: 3,
    name: "Emotional Settling",
    durationDays: 2,
    description: "Returning to baseline",
    stateModifiers: { emotionalBaseline: 5, stressAccumulation: -10 },
    moodTendency: "settling",
    energyPattern: "falling",
    behavioralNotes: ["Processing experiences", "Gentle engagement"],
  },
];

export const SAFETY_DISCLAIMERS = {
  cycles: "All behavioral cycles are simulated patterns for fictional character behavior. They do not represent, diagnose, or simulate any medical, hormonal, or psychological conditions. For entertainment and creative purposes only.",
  hormonal: "This simulated rhythm pattern is inspired by natural behavioral variations and is NOT a medical or biological representation. It is a behavioral simulation for fictional characters only.",
  fatigue: "Simulated fatigue patterns represent behavioral variations in character engagement, not real tiredness or medical conditions.",
  identity: "Identity expression settings are for character personalization and roleplay purposes only. They do not make claims about real identity or psychology.",
};

export interface CharacterInternalProfile {
  characterId: string;
  identityExpression: IdentityExpression;
  currentState: InternalStateSnapshot;
  activeCycles: BehavioralCycle[];
  fatigueProfile: FatigueState;
  boredomProfile: BoredomState;
  memoryMoodLinks: MemoryMoodLink[];
  responseInfluence: ResponseInfluence;
  lastUpdated: string;
}
