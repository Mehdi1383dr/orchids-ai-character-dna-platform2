"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, ChevronDown, TrendingUp, TrendingDown, Clock, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTION_COSTS, ACTION_LABELS, type LedgerActionType } from "@/lib/types/ledger";
import Link from "next/link";

function formatTokenAmount(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return amount.toString();
}

interface TokenBalanceData {
  balance: {
    total: number;
    subscription: number;
    purchased: number;
    freeDaily: number;
    admin: number;
  };
}

export function TokenBalance({ 
  showDropdown = true,
  compact = false,
}: { 
  showDropdown?: boolean;
  compact?: boolean;
}) {
  const [data, setData] = useState<TokenBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens/balance");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch token balance:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass animate-pulse">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">---</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const balance = data.balance;
  const isLow = balance.total < 20;
  const isCritical = balance.total < 5;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isCritical ? "bg-destructive/20 text-destructive" :
        isLow ? "bg-amber-500/20 text-amber-500" :
        "bg-primary/10 text-primary"
      }`}>
        <Zap className="w-3 h-3" />
        <span>{formatTokenAmount(balance.total)}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => showDropdown && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg glass transition-all ${
          showDropdown ? "hover:border-primary/30 cursor-pointer" : ""
        } ${
          isCritical ? "border-destructive/50" :
          isLow ? "border-amber-500/50" : ""
        }`}
      >
        <Zap className={`w-4 h-4 ${
          isCritical ? "text-destructive" :
          isLow ? "text-amber-500" :
          "text-primary"
        }`} />
        <span className="text-sm font-semibold">
          {formatTokenAmount(balance.total)}
        </span>
        {showDropdown && (
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {isOpen && showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full right-0 mt-2 w-72 rounded-xl glass border border-border/50 shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Token Balance</h4>
              <button 
                onClick={fetchBalance}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Free Daily</span>
                </div>
                <span className="font-medium">{balance.freeDaily}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Subscription</span>
                </div>
                <span className="font-medium">{formatTokenAmount(balance.subscription)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Purchased</span>
                </div>
                <span className="font-medium">{formatTokenAmount(balance.purchased)}</span>
              </div>
              {balance.admin > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Granted</span>
                  </div>
                  <span className="font-medium">{formatTokenAmount(balance.admin)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Link href="/pricing" onClick={() => setIsOpen(false)}>
                <Button size="sm" className="w-full gradient-primary border-0">
                  Buy More Tokens
                </Button>
              </Link>
              <Link href="/dashboard/tokens" onClick={() => setIsOpen(false)}>
                <Button size="sm" variant="outline" className="w-full">
                  View Ledger
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function TokenCostBadge({ 
  action, 
  className = "" 
}: { 
  action: LedgerActionType;
  className?: string;
}) {
  const cost = ACTION_COSTS[action] || 0;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary ${className}`}>
      <Zap className="w-3 h-3" />
      {cost}
    </span>
  );
}

export function TokenCostDisplay({ 
  action,
  showLabel = true,
}: { 
  action: LedgerActionType;
  showLabel?: boolean;
}) {
  const cost = ACTION_COSTS[action] || 0;
  const label = ACTION_LABELS[action] || action;

  return (
    <div className="flex items-center gap-2 text-sm">
      {showLabel && <span className="text-muted-foreground">{label}:</span>}
      <div className="flex items-center gap-1 text-primary font-medium">
        <Zap className="w-3.5 h-3.5" />
        <span>{cost} tokens</span>
      </div>
    </div>
  );
}

export function InsufficientTokensBanner({
  action,
  currentBalance,
  onBuyTokens,
}: {
  action: LedgerActionType;
  currentBalance: number;
  onBuyTokens?: () => void;
}) {
  const cost = ACTION_COSTS[action] || 0;
  const shortfall = cost - currentBalance;
  const label = ACTION_LABELS[action] || action;

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/10 border border-destructive/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="font-medium text-destructive">Insufficient Tokens</p>
          <p className="text-sm text-muted-foreground">
            {label} costs {cost} tokens. You need {shortfall} more.
          </p>
        </div>
      </div>
      {onBuyTokens ? (
        <Button size="sm" onClick={onBuyTokens} className="gradient-primary border-0">
          Buy Tokens
        </Button>
      ) : (
        <Link href="/pricing">
          <Button size="sm" className="gradient-primary border-0">
            Buy Tokens
          </Button>
        </Link>
      )}
    </div>
  );
}
