export type TraitCategory = "core" | "emotional" | "cognitive" | "social" | "behavioral";

export interface Trait {
  key: string;
  value: number;
  influenceWeight: number;
  description?: string;
}

export interface TraitDefinition {
  key: string;
  label: string;
  description: string;
  category: TraitCategory;
  opposites: [string, string];
  defaultValue: number;
}

export interface CharacterDNA {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  isDemo: boolean;
  isPublic: boolean;
  version: number;
  traits: {
    core: Trait[];
    emotional: Trait[];
    cognitive: Trait[];
    social: Trait[];
    behavioral: Trait[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface DNAVersion {
  id: string;
  characterId: string;
  version: number;
  traitsSnapshot: CharacterDNA["traits"];
  changeReason?: string;
  createdAt: string;
}

export const TRAIT_DEFINITIONS: TraitDefinition[] = [
  // Core Traits
  { key: "openness", label: "Openness", description: "Receptiveness to new experiences and ideas", category: "core", opposites: ["Traditional", "Innovative"], defaultValue: 50 },
  { key: "conscientiousness", label: "Conscientiousness", description: "Organization and dependability", category: "core", opposites: ["Spontaneous", "Methodical"], defaultValue: 50 },
  { key: "extraversion", label: "Extraversion", description: "Energy from social interaction", category: "core", opposites: ["Introverted", "Extraverted"], defaultValue: 50 },
  { key: "agreeableness", label: "Agreeableness", description: "Cooperation and trust", category: "core", opposites: ["Competitive", "Cooperative"], defaultValue: 50 },
  { key: "stability", label: "Emotional Stability", description: "Emotional resilience", category: "core", opposites: ["Reactive", "Stable"], defaultValue: 50 },
  
  // Emotional Traits
  { key: "empathy", label: "Empathy", description: "Understanding others' emotions", category: "emotional", opposites: ["Detached", "Empathetic"], defaultValue: 50 },
  { key: "expressiveness", label: "Expressiveness", description: "Outward display of emotions", category: "emotional", opposites: ["Reserved", "Expressive"], defaultValue: 50 },
  { key: "optimism", label: "Optimism", description: "Positive outlook on situations", category: "emotional", opposites: ["Pessimistic", "Optimistic"], defaultValue: 50 },
  { key: "sensitivity", label: "Sensitivity", description: "Emotional responsiveness", category: "emotional", opposites: ["Thick-skinned", "Sensitive"], defaultValue: 50 },
  { key: "warmth", label: "Warmth", description: "Friendliness and approachability", category: "emotional", opposites: ["Cool", "Warm"], defaultValue: 50 },
  
  // Cognitive Traits
  { key: "analytical", label: "Analytical", description: "Logical and systematic thinking", category: "cognitive", opposites: ["Intuitive", "Analytical"], defaultValue: 50 },
  { key: "creativity", label: "Creativity", description: "Novel idea generation", category: "cognitive", opposites: ["Practical", "Creative"], defaultValue: 50 },
  { key: "curiosity", label: "Curiosity", description: "Desire to learn and explore", category: "cognitive", opposites: ["Focused", "Curious"], defaultValue: 50 },
  { key: "decisiveness", label: "Decisiveness", description: "Speed and confidence in decisions", category: "cognitive", opposites: ["Deliberate", "Decisive"], defaultValue: 50 },
  { key: "complexity", label: "Complexity Preference", description: "Comfort with nuance", category: "cognitive", opposites: ["Simple", "Complex"], defaultValue: 50 },
  
  // Social Traits
  { key: "assertiveness", label: "Assertiveness", description: "Expressing needs confidently", category: "social", opposites: ["Passive", "Assertive"], defaultValue: 50 },
  { key: "dominance", label: "Dominance", description: "Leadership and control", category: "social", opposites: ["Follower", "Leader"], defaultValue: 50 },
  { key: "trust", label: "Trust", description: "Willingness to trust others", category: "social", opposites: ["Skeptical", "Trusting"], defaultValue: 50 },
  { key: "formality", label: "Formality", description: "Social formality preference", category: "social", opposites: ["Casual", "Formal"], defaultValue: 50 },
  { key: "independence", label: "Independence", description: "Self-reliance vs group orientation", category: "social", opposites: ["Collaborative", "Independent"], defaultValue: 50 },
  
  // Behavioral Traits
  { key: "patience", label: "Patience", description: "Tolerance for delays", category: "behavioral", opposites: ["Impatient", "Patient"], defaultValue: 50 },
  { key: "adaptability", label: "Adaptability", description: "Flexibility in changing situations", category: "behavioral", opposites: ["Rigid", "Adaptable"], defaultValue: 50 },
  { key: "directness", label: "Directness", description: "Communication style", category: "behavioral", opposites: ["Diplomatic", "Direct"], defaultValue: 50 },
  { key: "risktaking", label: "Risk Taking", description: "Comfort with uncertainty", category: "behavioral", opposites: ["Cautious", "Bold"], defaultValue: 50 },
  { key: "humor", label: "Humor", description: "Use of humor in interactions", category: "behavioral", opposites: ["Serious", "Playful"], defaultValue: 50 },
];

export const DEFAULT_DNA_TRAITS: CharacterDNA["traits"] = {
  core: TRAIT_DEFINITIONS.filter(t => t.category === "core").map(t => ({
    key: t.key,
    value: t.defaultValue,
    influenceWeight: 1.0,
  })),
  emotional: TRAIT_DEFINITIONS.filter(t => t.category === "emotional").map(t => ({
    key: t.key,
    value: t.defaultValue,
    influenceWeight: 1.0,
  })),
  cognitive: TRAIT_DEFINITIONS.filter(t => t.category === "cognitive").map(t => ({
    key: t.key,
    value: t.defaultValue,
    influenceWeight: 1.0,
  })),
  social: TRAIT_DEFINITIONS.filter(t => t.category === "social").map(t => ({
    key: t.key,
    value: t.defaultValue,
    influenceWeight: 1.0,
  })),
  behavioral: TRAIT_DEFINITIONS.filter(t => t.category === "behavioral").map(t => ({
    key: t.key,
    value: t.defaultValue,
    influenceWeight: 1.0,
  })),
};

export const TOKEN_COSTS = {
  chat_message: 1,
  character_creation: 50,
  dna_edit: 5,
  simulation_basic: 20,
  simulation_advanced: 50,
  fine_tuning: 200,
} as const;

export const SUBSCRIPTION_PLANS = {
  free: { 
    monthlyTokens: 50, 
    maxCharacters: 0, 
    canCreate: false,
    canSimulate: false,
    canFineTune: false,
    maxTraits: 0,
    maxVersionHistory: 0,
    price: 0,
  },
  basic: { 
    monthlyTokens: 500, 
    maxCharacters: 3, 
    canCreate: true,
    canSimulate: false,
    canFineTune: false,
    maxTraits: 15,
    maxVersionHistory: 5,
    price: 12,
  },
  pro: { 
    monthlyTokens: 2500, 
    maxCharacters: 15, 
    canCreate: true,
    canSimulate: true,
    canFineTune: true,
    maxTraits: -1,
    maxVersionHistory: -1,
    price: 39,
  },
  enterprise: { 
    monthlyTokens: 15000, 
    maxCharacters: -1, 
    canCreate: true,
    canSimulate: true,
    canFineTune: true,
    maxTraits: -1,
    maxVersionHistory: -1,
    price: 199,
  },
} as const;

export const TOKEN_PACKS = [
  { tokens: 100, price: 5, perToken: 0.05 },
  { tokens: 500, price: 20, perToken: 0.04 },
  { tokens: 1500, price: 45, perToken: 0.03 },
  { tokens: 5000, price: 125, perToken: 0.025 },
] as const;
