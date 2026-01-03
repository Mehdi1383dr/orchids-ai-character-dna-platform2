"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showStrength?: boolean;
  error?: string;
}

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
  { label: "Contains uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains lowercase", test: (p: string) => /[a-z]/.test(p) },
];

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, error, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const password = typeof value === "string" ? value : "";
    const passedRules = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
    const strengthPercent = (passedRules / PASSWORD_RULES.length) * 100;

    const getStrengthColor = () => {
      if (strengthPercent <= 25) return "bg-destructive";
      if (strengthPercent <= 50) return "bg-orange-500";
      if (strengthPercent <= 75) return "bg-yellow-500";
      return "bg-green-500";
    };

    const getStrengthLabel = () => {
      if (strengthPercent <= 25) return "Weak";
      if (strengthPercent <= 50) return "Fair";
      if (strengthPercent <= 75) return "Good";
      return "Strong";
    };

    return (
      <div className="space-y-2">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn(
              "pl-10 pr-10 h-12",
              "bg-white/[0.04] border-white/10",
              "focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
              error && "border-destructive/50 focus:ring-destructive/30",
              className
            )}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" />
            {error}
          </p>
        )}

        {showStrength && password && (isFocused || passedRules < PASSWORD_RULES.length) && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-300 rounded-full", getStrengthColor())}
                  style={{ width: `${strengthPercent}%` }}
                />
              </div>
              <span className={cn("text-xs font-medium", getStrengthColor().replace("bg-", "text-"))}>
                {getStrengthLabel()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {PASSWORD_RULES.map((rule, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    rule.test(password) ? "text-green-500" : "text-muted-foreground/60"
                  )}
                >
                  {rule.test(password) ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-current" />
                  )}
                  {rule.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
