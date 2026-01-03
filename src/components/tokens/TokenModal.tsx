"use client";

import { useState, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, TrendingDown, Crown, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ACTION_LABELS, type LedgerActionType } from "@/lib/types/ledger";

interface InsufficientTokensState {
  isOpen: boolean;
  action: LedgerActionType | null;
  cost: number;
  currentBalance: number;
  shortfall: number;
}

interface TokenModalContextType {
  showInsufficientTokens: (action: LedgerActionType, cost: number, currentBalance: number) => void;
  hideModal: () => void;
}

const TokenModalContext = createContext<TokenModalContextType | null>(null);

export function useTokenModal() {
  const context = useContext(TokenModalContext);
  if (!context) {
    throw new Error("useTokenModal must be used within TokenModalProvider");
  }
  return context;
}

const TOKEN_PACKS = [
  { tokens: 100, price: 5 },
  { tokens: 500, price: 20, popular: true },
  { tokens: 1500, price: 45 },
];

export function TokenModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InsufficientTokensState>({
    isOpen: false,
    action: null,
    cost: 0,
    currentBalance: 0,
    shortfall: 0,
  });

  const showInsufficientTokens = useCallback((
    action: LedgerActionType,
    cost: number,
    currentBalance: number
  ) => {
    setState({
      isOpen: true,
      action,
      cost,
      currentBalance,
      shortfall: Math.max(0, cost - currentBalance),
    });
  }, []);

  const hideModal = useCallback(() => {
    setState(s => ({ ...s, isOpen: false }));
  }, []);

  return (
    <TokenModalContext.Provider value={{ showInsufficientTokens, hideModal }}>
      {children}
      <InsufficientTokensModal state={state} onClose={hideModal} />
    </TokenModalContext.Provider>
  );
}

function InsufficientTokensModal({ 
  state, 
  onClose 
}: { 
  state: InsufficientTokensState;
  onClose: () => void;
}) {
  const { isOpen, action, cost, currentBalance, shortfall } = state;
  const actionLabel = action ? ACTION_LABELS[action] || action : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="glass rounded-2xl p-6 shadow-2xl border border-border/50">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                  <TrendingDown className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-2">Insufficient Tokens</h3>
                <p className="text-muted-foreground text-sm">
                  {actionLabel} requires <span className="text-foreground font-medium">{cost} tokens</span>.
                  <br />
                  You have <span className="text-destructive font-medium">{currentBalance} tokens</span> 
                  {" "}(need {shortfall} more).
                </p>
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Quick Top-Up</span>
                  <Link href="/pricing" className="text-xs text-primary hover:underline" onClick={onClose}>
                    See all options
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TOKEN_PACKS.map((pack) => (
                    <button
                      key={pack.tokens}
                      className={`relative p-3 rounded-lg border transition-all text-center ${
                        pack.popular 
                          ? "border-primary bg-primary/5" 
                          : "border-border/50 hover:border-primary/50"
                      }`}
                    >
                      {pack.popular && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          Popular
                        </span>
                      )}
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Zap className="w-3 h-3 text-primary" />
                        <span className="font-semibold text-sm">{pack.tokens}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">${pack.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/pricing" onClick={onClose}>
                  <Button className="w-full gradient-primary border-0" size="lg">
                    <Zap className="w-4 h-4 mr-2" />
                    Buy Tokens
                  </Button>
                </Link>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2 bg-background text-muted-foreground">or</span>
                  </div>
                </div>

                <Link href="/pricing" onClick={onClose}>
                  <Button variant="outline" className="w-full" size="lg">
                    <Crown className="w-4 h-4 mr-2 text-accent" />
                    Upgrade Plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                <p className="text-xs text-center text-muted-foreground">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Pro users get 2,500 tokens/month
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function TokenGatedButton({
  action,
  cost,
  onClick,
  children,
  disabled,
  className,
  ...props
}: {
  action: LedgerActionType;
  cost: number;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
} & Omit<React.ComponentProps<typeof Button>, "onClick">) {
  const [checking, setChecking] = useState(false);
  const { showInsufficientTokens } = useTokenModal();

  const handleClick = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/tokens/use?action=${action}`);
      const data = await res.json();
      
      if (!data.canAfford) {
        showInsufficientTokens(action, data.cost, data.currentBalance);
        return;
      }
      
      onClick();
    } catch {
      onClick();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || checking}
      className={className}
      {...props}
    >
      {children}
      <span className="ml-2 flex items-center gap-1 opacity-70">
        <Zap className="w-3 h-3" />
        {cost}
      </span>
    </Button>
  );
}
