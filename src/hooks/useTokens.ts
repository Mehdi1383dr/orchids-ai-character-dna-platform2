"use client";

import { useState, useCallback } from "react";
import { type LedgerActionType, ACTION_COSTS, ACTION_LABELS } from "@/lib/types/ledger";

interface BalanceCheckResult {
  canAfford: boolean;
  balance: number;
  cost: number;
  shortfall: number;
}

interface UseTokensResult {
  balance: number | null;
  loading: boolean;
  checkTokens: (action: LedgerActionType) => Promise<BalanceCheckResult>;
  useTokens: (action: LedgerActionType, options?: {
    referenceId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
    shortfall?: number;
    idempotent?: boolean;
  }>;
  refreshBalance: () => Promise<void>;
}

export function useTokens(): UseTokensResult {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance.total);
      }
    } catch {
      console.error("Failed to refresh balance");
    }
  }, []);

  const checkTokens = useCallback(async (action: LedgerActionType): Promise<BalanceCheckResult> => {
    const cost = ACTION_COSTS[action] || 0;
    
    try {
      const res = await fetch(`/api/tokens/use?action=${action}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        return data;
      }
    } catch {
      console.error("Failed to check tokens");
    }

    return {
      canAfford: balance !== null && balance >= cost,
      balance: balance || 0,
      cost,
      shortfall: balance !== null ? Math.max(0, cost - balance) : cost,
    };
  }, [balance]);

  const useTokens = useCallback(async (
    action: LedgerActionType,
    options?: {
      referenceId?: string;
      idempotencyKey?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    setLoading(true);
    
    try {
      const res = await fetch("/api/tokens/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...options }),
      });

      const data = await res.json();

      if (res.status === 402) {
        return {
          success: false,
          error: "Insufficient tokens",
          shortfall: data.shortfall,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Failed to use tokens",
        };
      }

      setBalance(data.newBalance);
      return {
        success: true,
        newBalance: data.newBalance,
        idempotent: data.idempotent,
      };
    } catch {
      return {
        success: false,
        error: "Network error",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    balance,
    loading,
    checkTokens,
    useTokens,
    refreshBalance,
  };
}

export function useTokenGate() {
  const { checkTokens, useTokens, balance, refreshBalance } = useTokens();

  const gatedAction = useCallback(async <T,>(
    action: LedgerActionType,
    performAction: () => Promise<T>,
    options?: {
      onInsufficientTokens?: (shortfall: number, cost: number) => void;
      referenceId?: string;
      idempotencyKey?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ success: boolean; result?: T; error?: string; idempotent?: boolean }> => {
    const check = await checkTokens(action);
    
    if (!check.canAfford) {
      options?.onInsufficientTokens?.(check.shortfall, check.cost);
      return {
        success: false,
        error: `Insufficient tokens. Need ${check.cost}, have ${check.balance}.`,
      };
    }

    const deductResult = await useTokens(action, {
      referenceId: options?.referenceId,
      idempotencyKey: options?.idempotencyKey,
      metadata: options?.metadata,
    });
    
    if (!deductResult.success) {
      return {
        success: false,
        error: deductResult.error,
      };
    }

    try {
      const result = await performAction();
      return { 
        success: true, 
        result,
        idempotent: deductResult.idempotent,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Action failed",
      };
    }
  }, [checkTokens, useTokens]);

  return {
    gatedAction,
    balance,
    refreshBalance,
    checkTokens,
  };
}

export function getActionCost(action: LedgerActionType): { cost: number; label: string } {
  return {
    cost: ACTION_COSTS[action] || 0,
    label: ACTION_LABELS[action] || action,
  };
}
