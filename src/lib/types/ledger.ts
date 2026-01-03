export type LedgerSourceType = "free" | "subscription" | "purchase" | "admin" | "expiration" | "rollover";
export type LedgerActionType = 
  | "chat" | "create_character" | "character_edit" 
  | "dna_edit" | "dna_edit_advanced" 
  | "simulation_basic" | "simulation_advanced" 
  | "fine_tune" | "api_call"
  | "grant" | "revoke" | "expire" | "rollover";

export interface TokenPool {
  id: string;
  userId: string;
  sourceType: LedgerSourceType;
  amount: number;
  remaining: number;
  expiresAt: string | null;
  rolloverEligible: boolean;
  referenceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  sourceType: LedgerSourceType;
  actionType: LedgerActionType | null;
  poolId: string | null;
  referenceId: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface LedgerBalance {
  userId: string;
  currentBalance: number;
  freeTokens: number;
  subscriptionTokens: number;
  purchasedTokens: number;
  adminTokens: number;
}

export const ACTION_COSTS: Record<string, number> = {
  chat: 1,
  create_character: 50,
  character_edit: 10,
  dna_edit: 5,
  dna_edit_advanced: 15,
  simulation_basic: 20,
  simulation_advanced: 50,
  fine_tune: 200,
  api_call: 2,
};

export const ACTION_LABELS: Record<string, string> = {
  chat: "Chat Message",
  create_character: "Create Character",
  character_edit: "Edit Character",
  dna_edit: "DNA Edit",
  dna_edit_advanced: "Advanced DNA Edit",
  simulation_basic: "Basic Simulation",
  simulation_advanced: "Advanced Simulation",
  fine_tune: "Fine-Tuning",
  api_call: "API Call",
};

export const POOL_PRIORITY: LedgerSourceType[] = ["free", "subscription", "admin", "purchase"];

export const FREE_DAILY_AMOUNT = 10;
export const SUBSCRIPTION_TOKENS = {
  free: 0,
  basic: 500,
  pro: 2500,
  enterprise: 15000,
};
export const PRO_ROLLOVER_CAP = 500;
