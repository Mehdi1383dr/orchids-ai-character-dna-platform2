export type TokenSource = "subscription" | "purchase" | "free_daily" | "refund" | "admin";
export type TokenAction = 
  | "chat_message"
  | "character_create"
  | "character_edit"
  | "dna_edit"
  | "dna_edit_advanced"
  | "simulation_basic"
  | "simulation_advanced"
  | "fine_tuning"
  | "api_call";

export const TOKEN_COSTS: Record<TokenAction, number> = {
  chat_message: 1,
  character_create: 50,
  character_edit: 10,
  dna_edit: 5,
  dna_edit_advanced: 15,
  simulation_basic: 20,
  simulation_advanced: 50,
  fine_tuning: 200,
  api_call: 2,
};

export const TOKEN_ACTION_LABELS: Record<TokenAction, string> = {
  chat_message: "Chat Message",
  character_create: "Create Character",
  character_edit: "Edit Character",
  dna_edit: "Edit DNA Trait",
  dna_edit_advanced: "Advanced DNA Edit",
  simulation_basic: "Basic Simulation",
  simulation_advanced: "Advanced Simulation",
  fine_tuning: "Fine-Tuning",
  api_call: "API Call",
};

export const FREE_DAILY_TOKENS = 10;
export const FREE_DAILY_RESET_HOUR = 0;

export interface TokenBalance {
  id: string;
  userId: string;
  subscriptionTokens: number;
  subscriptionTokensResetAt: string | null;
  purchasedTokens: number;
  freeDailyTokens: number;
  freeDailyTokensResetAt: string | null;
  lifetimeEarned: number;
  lifetimeSpent: number;
  totalAvailable: number;
  createdAt: string;
  updatedAt: string;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
  source: TokenSource;
  action: TokenAction | null;
  description: string | null;
  metadata: Record<string, unknown>;
  balanceAfter: number;
  createdAt: string;
}

export interface TokenDeductionResult {
  success: boolean;
  newBalance: number;
  tokensDeducted: number;
  deductionBreakdown: {
    fromFreeDaily: number;
    fromSubscription: number;
    fromPurchased: number;
  };
  error?: string;
}

export interface TokenCheckResult {
  canAfford: boolean;
  currentBalance: number;
  cost: number;
  shortfall: number;
}

export function getTokenCost(action: TokenAction): number {
  return TOKEN_COSTS[action];
}

export function formatTokenAmount(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return amount.toString();
}
