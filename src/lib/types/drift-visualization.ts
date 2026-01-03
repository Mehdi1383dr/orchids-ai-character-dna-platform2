import type { LatentTendencyName, BehaviorFieldDimension } from "./emergent-behavior";

export type PersonalityDomain =
  | "emotional_core"
  | "social_dynamics"
  | "cognitive_style"
  | "relational_patterns"
  | "expressive_tendencies"
  | "resilience_adaptation"
  | "curiosity_exploration"
  | "boundary_maintenance";

export interface DriftEvent {
  id: string;
  characterId: string;
  eventType: DriftEventType;
  occurredAt: number;
  timeRangeStart: number;
  timeRangeEnd: number;
  affectedDomains: PersonalityDomain[];
  primaryDomain: PersonalityDomain;
  direction: DriftDirection;
  magnitude: DriftMagnitude;
  permanenceLevel: PermanenceLevel;
  causalFactors: CausalFactor[];
  significance: number;
  humanReadableDescription: string;
  narrativeExplanation: string;
  isVisible: boolean;
  visibilityLevel: VisibilityLevel;
}

export type DriftEventType =
  | "gradual_shift"
  | "significant_change"
  | "stabilization"
  | "reversal"
  | "crystallization"
  | "softening"
  | "emergence"
  | "adaptation"
  | "recovery"
  | "deepening";

export type DriftDirection =
  | "toward_openness"
  | "toward_reservation"
  | "toward_warmth"
  | "toward_detachment"
  | "toward_stability"
  | "toward_volatility"
  | "toward_curiosity"
  | "toward_caution"
  | "toward_assertiveness"
  | "toward_deference"
  | "toward_vulnerability"
  | "toward_guardedness"
  | "neutral_fluctuation";

export type DriftMagnitude = "subtle" | "noticeable" | "significant" | "profound";

export type PermanenceLevel =
  | "transient"
  | "forming"
  | "stabilizing"
  | "established"
  | "crystallized";

export interface CausalFactor {
  factorType: CausalFactorType;
  contribution: number;
  description: string;
  timeframe: string;
  confidence: number;
}

export type CausalFactorType =
  | "interaction_pattern"
  | "sustained_emotional_state"
  | "relationship_dynamic"
  | "temporal_passage"
  | "stress_exposure"
  | "rest_recovery"
  | "significant_event"
  | "repeated_behavior"
  | "environmental_influence"
  | "internal_resolution";

export type VisibilityLevel = "public" | "creator_only" | "internal" | "hidden";

export interface PersonalityTimeline {
  characterId: string;
  events: DriftEvent[];
  currentSnapshot: PersonalitySnapshot;
  historicalSnapshots: PersonalitySnapshot[];
  overallTrajectory: TrajectoryAnalysis;
  generatedAt: number;
}

export interface PersonalitySnapshot {
  snapshotId: string;
  timestamp: number;
  domainStates: Map<PersonalityDomain, DomainState>;
  overallStability: number;
  evolutionPhase: EvolutionPhase;
  characterEssence: string;
}

export interface DomainState {
  domain: PersonalityDomain;
  position: number;
  velocity: number;
  stability: number;
  recentTrend: "growing" | "stable" | "softening";
}

export type EvolutionPhase =
  | "forming"
  | "exploring"
  | "stabilizing"
  | "mature"
  | "transforming"
  | "deepening";

export interface TrajectoryAnalysis {
  dominantDirection: DriftDirection;
  overallMagnitude: DriftMagnitude;
  stabilityTrend: "increasing" | "stable" | "decreasing";
  predictedPhase: EvolutionPhase;
  keyInfluences: string[];
}

export interface TraitConstellation {
  constellationId: string;
  name: string;
  description: string;
  stars: ConstellationStar[];
  connections: ConstellationConnection[];
  centerOfMass: { x: number; y: number };
  luminosity: number;
  stability: number;
}

export interface ConstellationStar {
  id: string;
  traitName: string;
  domain: PersonalityDomain;
  position: { x: number; y: number; z: number };
  brightness: number;
  size: number;
  color: string;
  pulseRate: number;
  isCore: boolean;
}

export interface ConstellationConnection {
  fromStarId: string;
  toStarId: string;
  strength: number;
  connectionType: "reinforcing" | "balancing" | "tension";
  visible: boolean;
}

export interface InfluenceField {
  fieldId: string;
  domain: PersonalityDomain;
  fieldType: FieldType;
  center: { x: number; y: number };
  radius: number;
  intensity: number;
  gradient: FieldGradient;
  flowDirection: number;
  turbulence: number;
}

export type FieldType =
  | "attraction"
  | "stabilization"
  | "growth"
  | "protection"
  | "exploration"
  | "connection";

export interface FieldGradient {
  innerColor: string;
  outerColor: string;
  opacity: number;
  blendMode: "normal" | "soft" | "glow";
}

export interface DomainCluster {
  clusterId: string;
  domain: PersonalityDomain;
  displayName: string;
  description: string;
  position: { x: number; y: number };
  size: number;
  cohesion: number;
  elements: ClusterElement[];
  dominantColor: string;
  secondaryColor: string;
  pulseIntensity: number;
}

export interface ClusterElement {
  elementId: string;
  name: string;
  value: number;
  contribution: number;
  visualWeight: number;
}

export interface AbstractVisualization {
  characterId: string;
  visualizationType: VisualizationType;
  constellations: TraitConstellation[];
  influenceFields: InfluenceField[];
  domainClusters: DomainCluster[];
  globalMetrics: GlobalVisualizationMetrics;
  animationState: AnimationState;
  generatedAt: number;
}

export type VisualizationType =
  | "constellation_map"
  | "field_dynamics"
  | "domain_clusters"
  | "evolution_flow"
  | "combined";

export interface GlobalVisualizationMetrics {
  overallHarmony: number;
  systemEntropy: number;
  evolutionMomentum: number;
  stabilityIndex: number;
  complexityScore: number;
}

export interface AnimationState {
  isAnimating: boolean;
  currentPhase: "idle" | "transition" | "pulse" | "flow";
  transitionProgress: number;
  breathingCycle: number;
}

export interface DirectionalIndicator {
  indicatorId: string;
  domain: PersonalityDomain;
  direction: DriftDirection;
  humanReadablePhrase: string;
  intensity: "slightly" | "noticeably" | "significantly" | "profoundly";
  timeframe: string;
  confidence: number;
}

export const DRIFT_DIRECTION_PHRASES: Record<DriftDirection, Record<"slightly" | "noticeably" | "significantly" | "profoundly", string>> = {
  toward_openness: {
    slightly: "becoming a bit more open",
    noticeably: "growing more open and receptive",
    significantly: "opening up considerably",
    profoundly: "transforming into a deeply open presence",
  },
  toward_reservation: {
    slightly: "becoming slightly more reserved",
    noticeably: "growing more private and measured",
    significantly: "becoming notably more reserved",
    profoundly: "retreating into deep privacy",
  },
  toward_warmth: {
    slightly: "showing hints of increased warmth",
    noticeably: "becoming warmer and more inviting",
    significantly: "radiating considerable warmth",
    profoundly: "embodying deep warmth and care",
  },
  toward_detachment: {
    slightly: "maintaining a bit more distance",
    noticeably: "becoming more emotionally measured",
    significantly: "establishing notable emotional distance",
    profoundly: "cultivating profound emotional independence",
  },
  toward_stability: {
    slightly: "gaining subtle emotional stability",
    noticeably: "becoming more emotionally grounded",
    significantly: "achieving remarkable stability",
    profoundly: "attaining deep emotional equilibrium",
  },
  toward_volatility: {
    slightly: "showing mild emotional variability",
    noticeably: "experiencing more emotional fluctuation",
    significantly: "navigating considerable emotional shifts",
    profoundly: "undergoing intense emotional transformation",
  },
  toward_curiosity: {
    slightly: "developing subtle curiosity",
    noticeably: "growing more curious and exploratory",
    significantly: "embracing strong curiosity",
    profoundly: "becoming deeply driven by wonder",
  },
  toward_caution: {
    slightly: "becoming slightly more cautious",
    noticeably: "developing greater carefulness",
    significantly: "adopting notable caution",
    profoundly: "embracing profound prudence",
  },
  toward_assertiveness: {
    slightly: "showing hints of increased confidence",
    noticeably: "becoming more self-assured",
    significantly: "developing strong assertiveness",
    profoundly: "embodying commanding presence",
  },
  toward_deference: {
    slightly: "becoming slightly more accommodating",
    noticeably: "growing more yielding",
    significantly: "developing notable deference",
    profoundly: "embracing deep humility",
  },
  toward_vulnerability: {
    slightly: "allowing subtle vulnerability",
    noticeably: "becoming more emotionally available",
    significantly: "embracing meaningful vulnerability",
    profoundly: "opening to profound emotional depth",
  },
  toward_guardedness: {
    slightly: "maintaining slightly stronger boundaries",
    noticeably: "becoming more protective of self",
    significantly: "developing strong emotional shields",
    profoundly: "establishing fortress-like protection",
  },
  neutral_fluctuation: {
    slightly: "experiencing minor fluctuations",
    noticeably: "going through natural variations",
    significantly: "undergoing dynamic changes",
    profoundly: "transforming in complex ways",
  },
};

export interface NarrativeExplanation {
  explanationId: string;
  driftEventId: string;
  summary: string;
  detailedNarrative: string;
  causalStory: string;
  emotionalContext: string;
  futureImplications: string;
  generatedAt: number;
}

export const CAUSAL_FACTOR_NARRATIVES: Record<CausalFactorType, string[]> = {
  interaction_pattern: [
    "Through many conversations, a pattern emerged",
    "The rhythm of interaction shaped this change",
    "Repeated exchanges gradually influenced",
  ],
  sustained_emotional_state: [
    "Extended emotional experiences led to",
    "Prolonged feelings created lasting impact",
    "Sustained emotional states reshaped",
  ],
  relationship_dynamic: [
    "The evolving relationship dynamic contributed to",
    "Connection patterns influenced",
    "Relational experiences shaped",
  ],
  temporal_passage: [
    "The passage of time naturally brought",
    "Over time, there emerged",
    "Gradual temporal evolution led to",
  ],
  stress_exposure: [
    "Navigating challenges resulted in",
    "Stress experiences transformed",
    "Difficult periods shaped",
  ],
  rest_recovery: [
    "Periods of rest allowed for",
    "Recovery time enabled",
    "Quieter moments fostered",
  ],
  significant_event: [
    "A meaningful moment sparked",
    "A significant experience catalyzed",
    "An important event triggered",
  ],
  repeated_behavior: [
    "Consistent behavioral patterns reinforced",
    "Repeated actions strengthened",
    "Habitual responses deepened",
  },
  environmental_influence: [
    "Environmental factors contributed to",
    "Contextual elements shaped",
    "Surrounding conditions influenced",
  ],
  internal_resolution: [
    "Internal processing resolved into",
    "Inner work manifested as",
    "Deep integration produced",
  ],
};

export interface ReversibilityAssessment {
  assessmentId: string;
  driftEventId: string;
  currentStatus: ReversibilityStatus;
  stabilizationProgress: number;
  estimatedTimeToStabilize: string;
  factors: ReversibilityFactor[];
  guidance: string;
}

export type ReversibilityStatus =
  | "highly_malleable"
  | "still_forming"
  | "stabilizing"
  | "largely_set"
  | "crystallized";

export interface ReversibilityFactor {
  factorName: string;
  influence: "supports_change" | "neutral" | "resists_change";
  weight: number;
  explanation: string;
}

export const REVERSIBILITY_DESCRIPTIONS: Record<ReversibilityStatus, string> = {
  highly_malleable: "This change is still very fluid and could easily shift in either direction",
  still_forming: "This development is taking shape but remains open to influence",
  stabilizing: "This change is beginning to settle but hasn't fully solidified",
  largely_set: "This evolution has largely taken hold, though subtle shifts remain possible",
  crystallized: "This has become a stable part of the character's nature",
};

export interface PrivacySettings {
  characterId: string;
  globalVisibility: VisibilityLevel;
  domainVisibility: Map<PersonalityDomain, VisibilityLevel>;
  eventTypeVisibility: Map<DriftEventType, VisibilityLevel>;
  showMagnitude: boolean;
  showCausalFactors: boolean;
  showReversibility: boolean;
  showTimeline: boolean;
  showConstellations: boolean;
  allowExport: boolean;
  lastUpdatedAt: number;
}

export const DEFAULT_PRIVACY_SETTINGS: Omit<PrivacySettings, "characterId" | "lastUpdatedAt"> = {
  globalVisibility: "creator_only",
  domainVisibility: new Map([
    ["emotional_core", "creator_only"],
    ["social_dynamics", "public"],
    ["cognitive_style", "public"],
    ["relational_patterns", "creator_only"],
    ["expressive_tendencies", "public"],
    ["resilience_adaptation", "creator_only"],
    ["curiosity_exploration", "public"],
    ["boundary_maintenance", "internal"],
  ]),
  eventTypeVisibility: new Map([
    ["gradual_shift", "public"],
    ["significant_change", "creator_only"],
    ["stabilization", "public"],
    ["reversal", "creator_only"],
    ["crystallization", "public"],
    ["softening", "public"],
    ["emergence", "creator_only"],
    ["adaptation", "public"],
    ["recovery", "internal"],
    ["deepening", "creator_only"],
  ]),
  showMagnitude: true,
  showCausalFactors: true,
  showReversibility: true,
  showTimeline: true,
  showConstellations: true,
  allowExport: false,
};

export interface DriftVisualizationConfig {
  significanceThreshold: number;
  timelineDepthDays: number;
  maxEventsDisplayed: number;
  constellationDensity: number;
  fieldResolution: number;
  animationSpeed: number;
  colorScheme: ColorScheme;
  narrativeStyle: NarrativeStyle;
}

export interface ColorScheme {
  primaryHue: number;
  warmColor: string;
  coolColor: string;
  neutralColor: string;
  highlightColor: string;
  backgroundGradient: string[];
}

export type NarrativeStyle = "poetic" | "conversational" | "clinical" | "metaphorical";

export const DEFAULT_DRIFT_VISUALIZATION_CONFIG: DriftVisualizationConfig = {
  significanceThreshold: 0.3,
  timelineDepthDays: 90,
  maxEventsDisplayed: 20,
  constellationDensity: 0.7,
  fieldResolution: 50,
  animationSpeed: 1.0,
  colorScheme: {
    primaryHue: 280,
    warmColor: "oklch(0.75 0.18 50)",
    coolColor: "oklch(0.7 0.15 240)",
    neutralColor: "oklch(0.6 0.05 280)",
    highlightColor: "oklch(0.85 0.2 320)",
    backgroundGradient: ["oklch(0.15 0.02 280)", "oklch(0.1 0.01 240)"],
  },
  narrativeStyle: "conversational",
};

export const DOMAIN_DISPLAY_NAMES: Record<PersonalityDomain, string> = {
  emotional_core: "Emotional Nature",
  social_dynamics: "Social Character",
  cognitive_style: "Thinking Patterns",
  relational_patterns: "Connection Style",
  expressive_tendencies: "Expression Mode",
  resilience_adaptation: "Adaptability",
  curiosity_exploration: "Curiosity",
  boundary_maintenance: "Boundaries",
};

export const DOMAIN_DESCRIPTIONS: Record<PersonalityDomain, string> = {
  emotional_core: "The fundamental emotional patterns that shape inner experience",
  social_dynamics: "How engagement with others naturally unfolds",
  cognitive_style: "The characteristic way of processing and understanding",
  relational_patterns: "Tendencies in forming and maintaining connections",
  expressive_tendencies: "Natural modes of communication and self-expression",
  resilience_adaptation: "Capacity to navigate challenges and change",
  curiosity_exploration: "Drive to discover, learn, and explore",
  boundary_maintenance: "Patterns of protecting and sharing self",
};

export const DOMAIN_COLORS: Record<PersonalityDomain, { primary: string; secondary: string; glow: string }> = {
  emotional_core: { primary: "oklch(0.7 0.2 350)", secondary: "oklch(0.6 0.15 350)", glow: "oklch(0.8 0.25 350 / 0.3)" },
  social_dynamics: { primary: "oklch(0.75 0.18 50)", secondary: "oklch(0.65 0.14 50)", glow: "oklch(0.85 0.2 50 / 0.3)" },
  cognitive_style: { primary: "oklch(0.7 0.15 200)", secondary: "oklch(0.6 0.12 200)", glow: "oklch(0.8 0.18 200 / 0.3)" },
  relational_patterns: { primary: "oklch(0.72 0.17 320)", secondary: "oklch(0.62 0.14 320)", glow: "oklch(0.82 0.2 320 / 0.3)" },
  expressive_tendencies: { primary: "oklch(0.75 0.2 80)", secondary: "oklch(0.65 0.16 80)", glow: "oklch(0.85 0.22 80 / 0.3)" },
  resilience_adaptation: { primary: "oklch(0.7 0.16 150)", secondary: "oklch(0.6 0.13 150)", glow: "oklch(0.8 0.18 150 / 0.3)" },
  curiosity_exploration: { primary: "oklch(0.72 0.18 280)", secondary: "oklch(0.62 0.15 280)", glow: "oklch(0.82 0.2 280 / 0.3)" },
  boundary_maintenance: { primary: "oklch(0.65 0.12 240)", secondary: "oklch(0.55 0.1 240)", glow: "oklch(0.75 0.15 240 / 0.3)" },
};

export const MAGNITUDE_TO_INTENSITY: Record<DriftMagnitude, "slightly" | "noticeably" | "significantly" | "profoundly"> = {
  subtle: "slightly",
  noticeable: "noticeably",
  significant: "significantly",
  profound: "profoundly",
};

export const EVOLUTION_PHASE_DESCRIPTIONS: Record<EvolutionPhase, string> = {
  forming: "Still taking shape, exploring fundamental patterns",
  exploring: "Actively discovering and testing different aspects",
  stabilizing: "Settling into consistent patterns",
  mature: "Well-established with stable characteristics",
  transforming: "Undergoing significant evolution",
  deepening: "Refining and enriching existing patterns",
};
