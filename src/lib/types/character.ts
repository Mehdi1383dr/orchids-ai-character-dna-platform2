export type CharacterStatus = "active" | "archived" | "locked";
export type CharacterVisibility = "private" | "shared" | "public";
export type CreationMode = "standard" | "advanced";

export interface CharacterIdentity {
  name: string;
  publicDescription: string | null;
  creatorNotes: string | null;
}

export interface CharacterPresentation {
  avatarUrl: string | null;
  voiceProfileId: string | null;
  visualProfileId: string | null;
}

export interface CharacterState {
  status: CharacterStatus;
  visibility: CharacterVisibility;
  creationMode: CreationMode;
}

export interface CharacterMetadata {
  createdAt: string;
  updatedAt: string;
  lastInteractionAt: string | null;
  version: number;
  forkedFrom: string | null;
  forkCount: number;
  interactionCount: number;
}

export interface Character {
  id: string;
  userId: string;
  identity: CharacterIdentity;
  presentation: CharacterPresentation;
  state: CharacterState;
  metadata: CharacterMetadata;
  isDemo: boolean;
}

export interface CharacterCreateInput {
  name: string;
  publicDescription?: string;
  creatorNotes?: string;
  avatarUrl?: string;
  visibility?: CharacterVisibility;
  creationMode: CreationMode;
  initialDNA?: DNATraitsInput;
}

export interface CharacterUpdateInput {
  name?: string;
  publicDescription?: string;
  creatorNotes?: string;
  avatarUrl?: string;
  visibility?: CharacterVisibility;
  status?: CharacterStatus;
}

export type TraitDomain = "personality" | "emotion" | "cognition" | "ethics" | "social";
export type TraitCategory = "core" | "emotional" | "cognitive" | "social" | "behavioral";

export interface DNATrait {
  id: string;
  characterId: string;
  domain: TraitDomain;
  category: TraitCategory;
  traitKey: string;
  traitValue: number;
  influenceWeight: number;
  resistance: number;
  volatility: number;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  minValue: number;
  maxValue: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DNATraitInput {
  domain?: TraitDomain;
  category: TraitCategory;
  traitKey: string;
  traitValue: number;
  influenceWeight?: number;
  resistance?: number;
  volatility?: number;
  minValue?: number;
  maxValue?: number;
  description?: string;
}

export interface DNATraitsInput {
  core?: DNATraitInput[];
  emotional?: DNATraitInput[];
  cognitive?: DNATraitInput[];
  social?: DNATraitInput[];
  behavioral?: DNATraitInput[];
}

export interface DNATraitRule {
  id: string;
  characterId: string;
  sourceTraitId: string;
  targetTraitId: string;
  ruleType: "dependency" | "conflict" | "correlation" | "inverse_correlation";
  strength: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DNATraitRuleInput {
  sourceTraitId: string;
  targetTraitId: string;
  ruleType: DNATraitRule["ruleType"];
  strength?: number;
  description?: string;
}

export interface DNAVersion {
  id: string;
  characterId: string;
  version: number;
  traitsSnapshot: Record<string, unknown>;
  changeReason: string | null;
  createdAt: string;
}

export interface DNAEvolutionLog {
  id: string;
  characterId: string;
  fromVersion: number;
  toVersion: number;
  evolutionType: "manual_edit" | "interaction" | "memory_impact" | "reset" | "rollback" | "fork";
  triggerSource: string | null;
  triggerReferenceId: string | null;
  traitChanges: TraitChange[];
  memoriesInvolved: string[];
  reasoningData: Record<string, unknown>;
  tokenCost: number;
  createdAt: string;
}

export interface TraitChange {
  traitId: string;
  traitKey: string;
  oldValue: number;
  newValue: number;
  changeReason?: string;
}

export type MemoryType = "short_term" | "long_term" | "core";
export type MemoryImportance = "low" | "medium" | "high" | "critical";

export interface CharacterMemory {
  id: string;
  characterId: string;
  memoryType: MemoryType;
  importance: MemoryImportance;
  content: string;
  contentHash: string | null;
  contextData: MemoryContext;
  emotionalImpact: EmotionalImpact;
  affectedTraits: AffectedTrait[];
  isImmutable: boolean;
  expiresAt: string | null;
  accessedCount: number;
  lastAccessedAt: string | null;
  sourceType: string | null;
  sourceReferenceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryContext {
  conversationId?: string;
  messageId?: string;
  topic?: string;
  participants?: string[];
  location?: string;
  timestamp?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface EmotionalImpact {
  valence?: number;
  arousal?: number;
  dominance?: number;
  primaryEmotion?: string;
  secondaryEmotions?: string[];
  intensity?: number;
  [key: string]: unknown;
}

export interface AffectedTrait {
  traitId: string;
  traitKey: string;
  impactStrength: number;
  direction: "increase" | "decrease" | "reinforce";
}

export interface MemoryCreateInput {
  memoryType: MemoryType;
  importance?: MemoryImportance;
  content: string;
  contextData?: MemoryContext;
  emotionalImpact?: EmotionalImpact;
  affectedTraits?: Omit<AffectedTrait, "traitId">[];
  isImmutable?: boolean;
  expiresAt?: string;
  sourceType?: string;
  sourceReferenceId?: string;
}

export type VoiceStyle = "neutral" | "warm" | "authoritative" | "playful" | "calm" | "energetic";

export interface VoiceProfile {
  id: string;
  characterId: string;
  voiceStyle: VoiceStyle;
  pitchBase: number;
  speedBase: number;
  emotionalModulation: Record<string, number>;
  accentReference: string | null;
  vendorVoiceId: string | null;
  vendorMetadata: Record<string, unknown>;
  customParams: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceProfileInput {
  voiceStyle?: VoiceStyle;
  pitchBase?: number;
  speedBase?: number;
  emotionalModulation?: Record<string, number>;
  accentReference?: string;
  customParams?: Record<string, unknown>;
}

export type AvatarStyle = "realistic" | "stylized" | "anime" | "cartoon" | "abstract";

export interface VisualProfile {
  id: string;
  characterId: string;
  avatarStyle: AvatarStyle;
  baseAppearance: AppearanceData;
  facialFeatures: FacialFeatures;
  expressionMappings: Record<string, ExpressionData>;
  styleReferences: StyleReference[];
  colorPalette: ColorPalette;
  vendorAvatarId: string | null;
  vendorMetadata: Record<string, unknown>;
  customParams: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppearanceData {
  age?: number;
  gender?: string;
  ethnicity?: string;
  bodyType?: string;
  height?: string;
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  skinTone?: string;
  [key: string]: unknown;
}

export interface FacialFeatures {
  faceShape?: string;
  eyeShape?: string;
  noseType?: string;
  lipShape?: string;
  jawline?: string;
  cheekbones?: string;
  [key: string]: unknown;
}

export interface ExpressionData {
  mouthCurve?: number;
  eyebrowPosition?: number;
  eyeOpenness?: number;
  headTilt?: number;
  [key: string]: unknown;
}

export interface StyleReference {
  type: "image" | "description" | "character_reference";
  url?: string;
  description?: string;
  weight?: number;
}

export interface ColorPalette {
  primary?: string;
  secondary?: string;
  accent?: string;
  skin?: string;
  hair?: string;
  eyes?: string;
  [key: string]: string | undefined;
}

export interface VisualProfileInput {
  avatarStyle?: AvatarStyle;
  baseAppearance?: AppearanceData;
  facialFeatures?: FacialFeatures;
  expressionMappings?: Record<string, ExpressionData>;
  styleReferences?: StyleReference[];
  colorPalette?: ColorPalette;
  customParams?: Record<string, unknown>;
}

export interface CharacterActionLog {
  id: string;
  characterId: string;
  userId: string;
  actionType: string;
  actionData: Record<string, unknown>;
  traitsInvolved: TraitInvolvement[];
  memoriesInvolved: string[];
  reasoningMetadata: ReasoningMetadata;
  tokenCost: number;
  responseTimeMs: number | null;
  createdAt: string;
}

export interface TraitInvolvement {
  traitId: string;
  traitKey: string;
  value: number;
  influence: number;
}

export interface ReasoningMetadata {
  decisionFactors?: DecisionFactor[];
  emotionalState?: EmotionalState;
  memoryReferences?: MemoryReference[];
  boundaryChecks?: BoundaryCheck[];
  [key: string]: unknown;
}

export interface DecisionFactor {
  factor: string;
  weight: number;
  source: "trait" | "memory" | "context";
}

export interface EmotionalState {
  primary: string;
  intensity: number;
  secondary?: string[];
}

export interface MemoryReference {
  memoryId: string;
  relevance: number;
  excerpt?: string;
}

export interface BoundaryCheck {
  boundary: string;
  result: "allowed" | "blocked" | "modified";
  reason?: string;
}

export interface CharacterFull extends Character {
  dna: {
    traits: DNATrait[];
    rules: DNATraitRule[];
    currentVersion: number;
  };
  memories: {
    core: CharacterMemory[];
    longTerm: CharacterMemory[];
    shortTermCount: number;
  };
  voiceProfile: VoiceProfile | null;
  visualProfile: VisualProfile | null;
}

export interface CharacterCloneOptions {
  newName: string;
  includeDNA: boolean;
  includeMemories: boolean;
  memoryTypes?: MemoryType[];
  includeVoiceProfile: boolean;
  includeVisualProfile: boolean;
}

export interface DNARollbackOptions {
  targetVersion: number;
  reason: string;
}

export interface DNAValidationResult {
  isValid: boolean;
  errors: DNAValidationError[];
  warnings: DNAValidationWarning[];
}

export interface DNAValidationError {
  traitKey: string;
  errorType: "out_of_range" | "locked" | "conflict" | "dependency_violated";
  message: string;
}

export interface DNAValidationWarning {
  traitKey: string;
  warningType: "high_volatility" | "unusual_combination" | "boundary_approaching";
  message: string;
}

export const TOKEN_COSTS = {
  character_creation: 50,
  character_clone: 30,
  dna_edit_single: 2,
  dna_edit_batch: 5,
  dna_lock_trait: 10,
  dna_unlock_trait: 5,
  dna_rollback: 15,
  dna_reset: 20,
  memory_add_short: 1,
  memory_add_long: 3,
  memory_add_core: 10,
  voice_generate: 25,
  image_generate: 50,
  avatar_2d: 75,
  avatar_3d: 150,
  simulation_basic: 20,
  simulation_advanced: 50,
  fine_tuning: 200,
  chat_message: 1,
} as const;

export const SUBSCRIPTION_LIMITS = {
  free: {
    maxCharacters: 0,
    canCreate: false,
    canClone: false,
    canEditDNA: false,
    canLockTraits: false,
    maxMemories: 0,
    maxVersionHistory: 0,
    canGenerateVoice: false,
    canGenerateImage: false,
    canGenerateAvatar: false,
    monthlyTokens: 50,
  },
  basic: {
    maxCharacters: 3,
    canCreate: true,
    canClone: false,
    canEditDNA: true,
    canLockTraits: false,
    maxMemories: 50,
    maxVersionHistory: 5,
    canGenerateVoice: false,
    canGenerateImage: false,
    canGenerateAvatar: false,
    monthlyTokens: 500,
  },
  pro: {
    maxCharacters: 15,
    canCreate: true,
    canClone: true,
    canEditDNA: true,
    canLockTraits: true,
    maxMemories: 500,
    maxVersionHistory: -1,
    canGenerateVoice: true,
    canGenerateImage: true,
    canGenerateAvatar: false,
    monthlyTokens: 2500,
  },
  enterprise: {
    maxCharacters: -1,
    canCreate: true,
    canClone: true,
    canEditDNA: true,
    canLockTraits: true,
    maxMemories: -1,
    maxVersionHistory: -1,
    canGenerateVoice: true,
    canGenerateImage: true,
    canGenerateAvatar: true,
    monthlyTokens: 15000,
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_LIMITS;
