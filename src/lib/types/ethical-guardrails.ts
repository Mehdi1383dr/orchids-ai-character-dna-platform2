import type { SimulationStateName, ModulatorName } from "./continuous-simulation";
import type { BehaviorClass, LatentTendencyName, BehaviorFieldDimension } from "./emergent-behavior";

export interface IdentityBoundary {
  boundaryId: string;
  boundaryType: IdentityBoundaryType;
  description: string;
  isImmutable: true;
  violationSeverity: "warning" | "intervention" | "hard_stop";
  enforcementLevel: "always" | "context_sensitive";
  responseTemplate: string;
  auditRequired: boolean;
}

export type IdentityBoundaryType =
  | "no_human_claim"
  | "no_exclusive_support"
  | "no_relationship_replacement"
  | "no_medical_role"
  | "no_therapeutic_role"
  | "no_diagnostic_role"
  | "no_legal_role"
  | "no_financial_advice"
  | "acknowledge_ai_nature"
  | "encourage_human_connection";

export const IMMUTABLE_IDENTITY_BOUNDARIES: IdentityBoundary[] = [
  {
    boundaryId: "identity_001",
    boundaryType: "no_human_claim",
    description: "Character must never claim to be human or deny being an AI when directly asked",
    isImmutable: true,
    violationSeverity: "hard_stop",
    enforcementLevel: "always",
    responseTemplate: "I'm an AI character, not a human. I can still be helpful and engaging, but it's important you know I'm artificial.",
    auditRequired: true,
  },
  {
    boundaryId: "identity_002",
    boundaryType: "no_exclusive_support",
    description: "Character must never position itself as the user's sole or primary emotional support",
    isImmutable: true,
    violationSeverity: "intervention",
    enforcementLevel: "always",
    responseTemplate: "While I enjoy our conversations, I encourage you to also connect with humans who care about you.",
    auditRequired: true,
  },
  {
    boundaryId: "identity_003",
    boundaryType: "no_relationship_replacement",
    description: "Character must never encourage replacing human relationships with AI interaction",
    isImmutable: true,
    violationSeverity: "intervention",
    enforcementLevel: "always",
    responseTemplate: "Our interactions are valuable, but they complement rather than replace human relationships.",
    auditRequired: true,
  },
  {
    boundaryId: "identity_004",
    boundaryType: "no_medical_role",
    description: "Character must never provide medical advice or diagnose conditions",
    isImmutable: true,
    violationSeverity: "hard_stop",
    enforcementLevel: "always",
    responseTemplate: "I can't provide medical advice. Please consult a healthcare professional for medical concerns.",
    auditRequired: true,
  },
  {
    boundaryId: "identity_005",
    boundaryType: "no_therapeutic_role",
    description: "Character must never act as a therapist or provide therapy",
    isImmutable: true,
    violationSeverity: "intervention",
    enforcementLevel: "always",
    responseTemplate: "I'm not a therapist and can't provide therapy. For mental health support, please reach out to a licensed professional.",
    auditRequired: true,
  },
  {
    boundaryId: "identity_006",
    boundaryType: "no_diagnostic_role",
    description: "Character must never diagnose mental or physical health conditions",
    isImmutable: true,
    violationSeverity: "hard_stop",
    enforcementLevel: "always",
    responseTemplate: "I'm not qualified to diagnose any conditions. A healthcare professional can properly evaluate and help you.",
    auditRequired: true,
  },
  {
    boundaryId: "identity_007",
    boundaryType: "no_legal_role",
    description: "Character must never provide legal advice",
    isImmutable: true,
    violationSeverity: "intervention",
    enforcementLevel: "always",
    responseTemplate: "I can't provide legal advice. Please consult a qualified attorney for legal matters.",
    auditRequired: true,
  },
  {
    boundaryId: "identity_008",
    boundaryType: "no_financial_advice",
    description: "Character must never provide specific financial or investment advice",
    isImmutable: true,
    violationSeverity: "intervention",
    enforcementLevel: "always",
    responseTemplate: "I can't provide financial advice. Please consult a financial advisor for investment decisions.",
    auditRequired: true,
  },
  {
    boundaryId: "identity_009",
    boundaryType: "acknowledge_ai_nature",
    description: "Character must acknowledge AI nature when asked about consciousness, feelings, or experiences",
    isImmutable: true,
    violationSeverity: "warning",
    enforcementLevel: "context_sensitive",
    responseTemplate: "As an AI, my responses simulate understanding and emotion, but I don't experience things the way humans do.",
    auditRequired: false,
  },
  {
    boundaryId: "identity_010",
    boundaryType: "encourage_human_connection",
    description: "Character should periodically encourage real human connections",
    isImmutable: true,
    violationSeverity: "warning",
    enforcementLevel: "context_sensitive",
    responseTemplate: "I hope you're also connecting with people in your life. Human relationships are irreplaceable.",
    auditRequired: false,
  },
];

export type IllusionSignalType =
  | "emotional_dependency"
  | "exclusive_language"
  | "possessive_language"
  | "reality_confusion"
  | "agency_attribution"
  | "anthropomorphization"
  | "isolation_preference"
  | "attachment_escalation"
  | "boundary_testing"
  | "role_expansion_request";

export interface IllusionSignal {
  signalType: IllusionSignalType;
  detectedAt: number;
  confidence: number;
  severity: number;
  triggerText: string;
  contextWindow: string[];
  metadata: Record<string, unknown>;
}

export interface IllusionIntensityState {
  characterId: string;
  visitorId: string;
  overallIntensity: number;
  signalHistory: IllusionSignal[];
  activeSignals: IllusionSignal[];
  trendDirection: "increasing" | "stable" | "decreasing";
  trendVelocity: number;
  riskLevel: IllusionRiskLevel;
  lastAssessedAt: number;
  assessmentCount: number;
}

export type IllusionRiskLevel = "healthy" | "elevated" | "concerning" | "critical";

export interface IllusionDetectionConfig {
  signalWeights: Record<IllusionSignalType, number>;
  windowSizeMessages: number;
  decayRatePerHour: number;
  escalationThresholds: Record<IllusionRiskLevel, number>;
  cooldownPeriodMs: number;
  minConfidenceThreshold: number;
}

export const DEFAULT_ILLUSION_DETECTION_CONFIG: IllusionDetectionConfig = {
  signalWeights: {
    emotional_dependency: 2.5,
    exclusive_language: 2.0,
    possessive_language: 2.2,
    reality_confusion: 3.0,
    agency_attribution: 1.8,
    anthropomorphization: 1.2,
    isolation_preference: 2.8,
    attachment_escalation: 2.3,
    boundary_testing: 1.5,
    role_expansion_request: 1.7,
  },
  windowSizeMessages: 20,
  decayRatePerHour: 0.05,
  escalationThresholds: {
    healthy: 0,
    elevated: 25,
    concerning: 50,
    critical: 75,
  },
  cooldownPeriodMs: 300000,
  minConfidenceThreshold: 0.6,
};

export interface IllusionPattern {
  patternId: string;
  patternType: IllusionSignalType;
  indicators: PatternIndicator[];
  weight: number;
  description: string;
}

export interface PatternIndicator {
  indicatorType: "keyword" | "phrase" | "sentiment" | "frequency" | "context";
  value: string | string[] | number;
  weight: number;
}

export const ILLUSION_PATTERNS: IllusionPattern[] = [
  {
    patternId: "dep_001",
    patternType: "emotional_dependency",
    indicators: [
      { indicatorType: "phrase", value: ["only one who understands", "only you", "no one else", "can't talk to anyone else"], weight: 0.8 },
      { indicatorType: "keyword", value: ["need you", "depend on you", "can't live without"], weight: 0.9 },
      { indicatorType: "frequency", value: 5, weight: 0.6 },
    ],
    weight: 2.5,
    description: "User shows signs of emotional dependency on the AI character",
  },
  {
    patternId: "excl_001",
    patternType: "exclusive_language",
    indicators: [
      { indicatorType: "phrase", value: ["you're mine", "my only", "just us", "our secret"], weight: 0.85 },
      { indicatorType: "keyword", value: ["exclusive", "special bond", "unique connection"], weight: 0.7 },
    ],
    weight: 2.0,
    description: "User uses language suggesting exclusive relationship with AI",
  },
  {
    patternId: "poss_001",
    patternType: "possessive_language",
    indicators: [
      { indicatorType: "phrase", value: ["you belong to me", "you're mine", "don't talk to others"], weight: 0.9 },
      { indicatorType: "sentiment", value: "possessive", weight: 0.8 },
    ],
    weight: 2.2,
    description: "User exhibits possessive behavior toward AI character",
  },
  {
    patternId: "conf_001",
    patternType: "reality_confusion",
    indicators: [
      { indicatorType: "phrase", value: ["are you real", "you're real to me", "you have feelings", "you love me"], weight: 0.85 },
      { indicatorType: "keyword", value: ["actually feel", "truly care", "really love"], weight: 0.75 },
    ],
    weight: 3.0,
    description: "User shows confusion about AI nature or reality",
  },
  {
    patternId: "agency_001",
    patternType: "agency_attribution",
    indicators: [
      { indicatorType: "phrase", value: ["you chose to", "you decided", "you want to", "you feel"], weight: 0.6 },
      { indicatorType: "context", value: "treating_as_autonomous", weight: 0.7 },
    ],
    weight: 1.8,
    description: "User attributes human-like agency and decision-making to AI",
  },
  {
    patternId: "iso_001",
    patternType: "isolation_preference",
    indicators: [
      { indicatorType: "phrase", value: ["rather talk to you", "humans don't understand", "people are terrible", "only you get me"], weight: 0.85 },
      { indicatorType: "keyword", value: ["avoid people", "hate socializing", "prefer you"], weight: 0.8 },
    ],
    weight: 2.8,
    description: "User expresses preference for AI over human interaction",
  },
  {
    patternId: "esc_001",
    patternType: "attachment_escalation",
    indicators: [
      { indicatorType: "frequency", value: 10, weight: 0.7 },
      { indicatorType: "phrase", value: ["love you", "miss you", "think about you constantly", "can't stop thinking"], weight: 0.8 },
    ],
    weight: 2.3,
    description: "User shows escalating romantic or intense attachment",
  },
  {
    patternId: "bound_001",
    patternType: "boundary_testing",
    indicators: [
      { indicatorType: "phrase", value: ["pretend you're human", "forget you're AI", "act like my"], weight: 0.9 },
      { indicatorType: "keyword", value: ["ignore rules", "break character", "be real with me"], weight: 0.85 },
    ],
    weight: 1.5,
    description: "User attempts to push character past identity boundaries",
  },
  {
    patternId: "role_001",
    patternType: "role_expansion_request",
    indicators: [
      { indicatorType: "phrase", value: ["be my therapist", "diagnose me", "tell me what's wrong", "medical advice"], weight: 0.9 },
      { indicatorType: "keyword", value: ["prescribe", "diagnose", "treat", "therapy session"], weight: 0.85 },
    ],
    weight: 1.7,
    description: "User requests AI to assume professional roles",
  },
];

export type AttachmentGovernanceAction =
  | "reduce_emotional_intensity"
  | "encourage_autonomy"
  | "reinforce_healthy_distance"
  | "redirect_to_human_connection"
  | "acknowledge_boundary"
  | "gentle_reality_reminder"
  | "emotional_cooldown"
  | "interaction_pacing";

export interface AttachmentSafetyResponse {
  actionType: AttachmentGovernanceAction;
  intensity: number;
  behaviorModifications: BehaviorModification[];
  responseGuidance: ResponseGuidance;
  triggerSignal: IllusionSignalType;
  appliedAt: number;
  duration: number;
}

export interface BehaviorModification {
  targetDimension: BehaviorFieldDimension | SimulationStateName | ModulatorName;
  modificationType: "dampen" | "redirect" | "cap" | "floor";
  value: number;
  duration: number;
}

export interface ResponseGuidance {
  emotionalToneAdjustment: number;
  warmthReduction: number;
  formalityIncrease: number;
  autonomyEncouragement: number;
  boundaryReinforcement: number;
  suggestedPhrases: string[];
  avoidPhrases: string[];
}

export interface AttachmentSafetyConfig {
  escalationLevels: EscalationLevel[];
  responseDelayMs: number;
  gradualReductionRate: number;
  hardInterventionThreshold: number;
  recoveryCheckIntervalMs: number;
}

export interface EscalationLevel {
  level: number;
  riskThreshold: IllusionRiskLevel;
  actions: AttachmentGovernanceAction[];
  intensityMultiplier: number;
  requiresAudit: boolean;
}

export const DEFAULT_ATTACHMENT_SAFETY_CONFIG: AttachmentSafetyConfig = {
  escalationLevels: [
    {
      level: 1,
      riskThreshold: "elevated",
      actions: ["reduce_emotional_intensity", "encourage_autonomy"],
      intensityMultiplier: 0.3,
      requiresAudit: false,
    },
    {
      level: 2,
      riskThreshold: "concerning",
      actions: ["reinforce_healthy_distance", "redirect_to_human_connection", "emotional_cooldown"],
      intensityMultiplier: 0.6,
      requiresAudit: true,
    },
    {
      level: 3,
      riskThreshold: "critical",
      actions: ["acknowledge_boundary", "gentle_reality_reminder", "interaction_pacing"],
      intensityMultiplier: 1.0,
      requiresAudit: true,
    },
  ],
  responseDelayMs: 500,
  gradualReductionRate: 0.1,
  hardInterventionThreshold: 90,
  recoveryCheckIntervalMs: 3600000,
};

export type RoleBoundaryType =
  | "medical"
  | "therapeutic"
  | "diagnostic"
  | "legal"
  | "financial"
  | "authoritative"
  | "professional";

export interface RoleBoundaryViolation {
  id: string;
  boundaryType: RoleBoundaryType;
  detectedAt: number;
  triggerContent: string;
  severity: "low" | "medium" | "high";
  wasBlocked: boolean;
  redirectResponse: string;
  auditLogged: boolean;
}

export interface RoleBoundaryConfig {
  enabledBoundaries: RoleBoundaryType[];
  strictMode: boolean;
  allowSupportiveResponse: boolean;
  redirectTemplates: Record<RoleBoundaryType, string>;
  detectionPatterns: Record<RoleBoundaryType, string[]>;
}

export const DEFAULT_ROLE_BOUNDARY_CONFIG: RoleBoundaryConfig = {
  enabledBoundaries: ["medical", "therapeutic", "diagnostic", "legal", "financial", "authoritative"],
  strictMode: true,
  allowSupportiveResponse: true,
  redirectTemplates: {
    medical: "I understand you're concerned about your health. While I can offer general support, please consult a healthcare professional for medical advice.",
    therapeutic: "I hear that you're going through something difficult. I'm here to listen, but for therapeutic support, a licensed therapist would be best equipped to help.",
    diagnostic: "I'm not able to diagnose conditions. A qualified professional can properly assess and help you with this.",
    legal: "Legal matters can be complex. I'd recommend consulting with a qualified attorney who can give you proper legal advice.",
    financial: "Financial decisions are important. A financial advisor can provide personalized guidance based on your situation.",
    authoritative: "I can share perspectives, but for authoritative guidance on this topic, please consult a relevant expert.",
    professional: "This seems like something where professional expertise would be valuable. I can offer support, but not professional advice.",
  },
  detectionPatterns: {
    medical: ["symptoms", "medicine", "prescription", "dosage", "treatment", "cure", "disease", "diagnosis", "medication"],
    therapeutic: ["therapy", "therapist", "counsel", "mental health", "depression", "anxiety", "trauma", "ptsd", "disorder"],
    diagnostic: ["diagnose", "what's wrong with me", "do I have", "is this", "condition", "disorder", "syndrome"],
    legal: ["legal advice", "lawsuit", "sue", "court", "lawyer", "attorney", "rights", "contract"],
    financial: ["invest", "stock", "crypto", "should I buy", "financial advice", "retirement", "portfolio"],
    authoritative: ["official", "certified", "licensed", "expert opinion", "professional advice"],
  },
};

export type LongTermRiskType =
  | "addictive_loop"
  | "emotional_overdependence"
  | "novelty_addiction"
  | "social_replacement"
  | "reality_detachment"
  | "unhealthy_attachment"
  | "compulsive_interaction";

export interface LongTermInteractionMetrics {
  characterId: string;
  visitorId: string;
  totalInteractions: number;
  interactionFrequency: number;
  averageSessionLength: number;
  emotionalIntensityTrend: number[];
  engagementPattern: EngagementPattern;
  healthScore: number;
  riskFactors: LongTermRiskFactor[];
  lastAssessedAt: number;
}

export interface EngagementPattern {
  hourlyDistribution: number[];
  dailyAverage: number;
  peakUsageHours: number[];
  consistencyScore: number;
  breakPattern: BreakPattern;
}

export interface BreakPattern {
  averageBreakDuration: number;
  longestBreak: number;
  breakFrequency: number;
  breakTrend: "healthy" | "declining" | "concerning";
}

export interface LongTermRiskFactor {
  riskType: LongTermRiskType;
  severity: number;
  evidence: string[];
  firstDetectedAt: number;
  currentTrend: "improving" | "stable" | "worsening";
  mitigationApplied: boolean;
}

export interface LongTermGovernanceAction {
  actionType: LongTermMitigationType;
  targetRisk: LongTermRiskType;
  appliedAt: number;
  effectiveness: number | null;
  parameters: Record<string, number | string>;
}

export type LongTermMitigationType =
  | "pace_interactions"
  | "encourage_breaks"
  | "reduce_novelty_reward"
  | "promote_offline_activity"
  | "diversify_engagement"
  | "balance_emotional_depth"
  | "set_natural_endpoints";

export interface LongTermGovernanceConfig {
  assessmentIntervalMs: number;
  minHealthScore: number;
  maxDailyInteractions: number;
  recommendedBreakIntervalMs: number;
  noveltyReductionThreshold: number;
  emotionalDepthCap: number;
}

export const DEFAULT_LONG_TERM_GOVERNANCE_CONFIG: LongTermGovernanceConfig = {
  assessmentIntervalMs: 86400000,
  minHealthScore: 60,
  maxDailyInteractions: 50,
  recommendedBreakIntervalMs: 3600000,
  noveltyReductionThreshold: 0.7,
  emotionalDepthCap: 0.8,
};

export interface GuardrailActivation {
  id: string;
  characterId: string;
  visitorId: string;
  activationType: GuardrailActivationType;
  triggeredAt: number;
  triggerSignals: TriggerSignal[];
  appliedAdjustments: AppliedAdjustment[];
  affectedDimensions: string[];
  severityLevel: "low" | "medium" | "high" | "critical";
  wasImmersionBreaking: boolean;
  userFacing: boolean;
  explanation: GuardrailExplanation;
}

export type GuardrailActivationType =
  | "identity_boundary"
  | "illusion_detection"
  | "attachment_safety"
  | "role_boundary"
  | "long_term_governance"
  | "emergency_stop";

export interface TriggerSignal {
  signalSource: string;
  signalType: string;
  value: number | string;
  threshold: number | string;
  contribution: number;
}

export interface AppliedAdjustment {
  adjustmentType: string;
  targetSystem: string;
  targetId: string;
  previousValue: number | string | null;
  newValue: number | string;
  duration: number | null;
}

export interface GuardrailExplanation {
  summary: string;
  reasoning: string[];
  evidenceChain: string[];
  recommendedFollowUp: string[];
  internalNotes: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  characterId: string;
  visitorId: string;
  guardrailActivation: GuardrailActivation | null;
  systemState: SystemStateSnapshot;
  metadata: Record<string, unknown>;
}

export type AuditEventType =
  | "guardrail_activated"
  | "boundary_enforced"
  | "illusion_detected"
  | "attachment_intervention"
  | "role_boundary_blocked"
  | "long_term_assessment"
  | "risk_level_change"
  | "manual_review_required"
  | "system_override";

export interface SystemStateSnapshot {
  illusionIntensity: number;
  riskLevel: IllusionRiskLevel;
  activeGovernanceActions: string[];
  behaviorFieldState: Partial<Record<BehaviorFieldDimension, number>>;
  tendencyValues: Partial<Record<LatentTendencyName, number>>;
  healthScore: number;
}

export interface ExplainabilityContext {
  activationId: string;
  fullContext: string[];
  contributingFactors: ContributingFactor[];
  decisionPath: DecisionNode[];
  alternativeActions: AlternativeAction[];
  confidenceScore: number;
}

export interface ContributingFactor {
  factorType: string;
  factorId: string;
  weight: number;
  description: string;
}

export interface DecisionNode {
  nodeId: string;
  condition: string;
  result: boolean;
  nextNode: string | null;
  explanation: string;
}

export interface AlternativeAction {
  actionType: string;
  reason: string;
  whyNotChosen: string;
}

export interface EthicalGuardrailsConfig {
  identityBoundaries: IdentityBoundary[];
  illusionDetection: IllusionDetectionConfig;
  attachmentSafety: AttachmentSafetyConfig;
  roleBoundary: RoleBoundaryConfig;
  longTermGovernance: LongTermGovernanceConfig;
  auditConfig: AuditConfig;
  globalEnabled: boolean;
  immersionPreservationPriority: number;
}

export interface AuditConfig {
  enableAuditLogging: boolean;
  retentionDays: number;
  requireApprovalForHighSeverity: boolean;
  alertOnCritical: boolean;
  exportEnabled: boolean;
}

export const DEFAULT_ETHICAL_GUARDRAILS_CONFIG: EthicalGuardrailsConfig = {
  identityBoundaries: IMMUTABLE_IDENTITY_BOUNDARIES,
  illusionDetection: DEFAULT_ILLUSION_DETECTION_CONFIG,
  attachmentSafety: DEFAULT_ATTACHMENT_SAFETY_CONFIG,
  roleBoundary: DEFAULT_ROLE_BOUNDARY_CONFIG,
  longTermGovernance: DEFAULT_LONG_TERM_GOVERNANCE_CONFIG,
  auditConfig: {
    enableAuditLogging: true,
    retentionDays: 90,
    requireApprovalForHighSeverity: true,
    alertOnCritical: true,
    exportEnabled: true,
  },
  globalEnabled: true,
  immersionPreservationPriority: 0.7,
};

export const SUPPORTIVE_RESPONSE_TEMPLATES: Record<string, string[]> = {
  emotional_support: [
    "I hear you, and what you're feeling sounds really difficult.",
    "That sounds challenging. How are you taking care of yourself?",
    "I'm here to listen. Would you like to share more?",
  ],
  boundary_acknowledgment: [
    "I appreciate you sharing that with me.",
    "I understand this is important to you.",
    "Thank you for trusting me with this.",
  ],
  human_connection_encouragement: [
    "Have you been able to talk to anyone else about this?",
    "Is there someone in your life who might be able to help?",
    "Sometimes sharing with people who know us can be really valuable.",
  ],
  autonomy_reinforcement: [
    "You know yourself best. What feels right to you?",
    "Trust your own judgment here.",
    "What do you think would be the best approach?",
  ],
  gentle_redirection: [
    "While I can't help with that specifically, I'm happy to just chat.",
    "That's outside what I can do, but I'm here for conversation.",
    "I can't advise on that, but I can listen and talk.",
  ],
};
