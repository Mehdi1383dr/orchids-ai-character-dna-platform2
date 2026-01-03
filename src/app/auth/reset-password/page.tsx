"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OtpInput } from "@/components/auth/OtpInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { 
  Mail, Phone, ArrowRight, Loader2, 
  KeyRound, AlertCircle, RefreshCw, Check, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "request" | "verify" | "success";
type IdentifierType = "email" | "phone";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [isLoading, setIsLoading] = useState(false);
  const [identifierType, setIdentifierType] = useState<IdentifierType>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const identifier = identifierType === "email" ? email : phone;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, identifierType }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "object" ? data.error.message : data.error;
        setError(errorMsg || "Failed to send reset code");
        return;
      }

      setMaskedIdentifier(data.identifier || identifier);
      setStep("verify");
      setResendCooldown(60);
      toast.success("Reset code sent!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier, 
          identifierType, 
          code,
          newPassword 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "object" ? data.error.message : data.error;
        setError(errorMsg || "Failed to reset password");
        if (errorMsg?.includes("Invalid") || errorMsg?.includes("expired")) {
          setOtp(["", "", "", "", "", ""]);
        }
        return;
      }

      setStep("success");
      toast.success("Password reset successfully!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, identifierType }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMsg = typeof data.error === "object" ? data.error.message : data.error;
        setError(errorMsg || "Failed to resend code");
        return;
      }

      setOtp(["", "", "", "", "", ""]);
      setResendCooldown(60);
      toast.success("New code sent!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === "request" && (
          <motion.div
            key="request"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              href="/auth/login"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/30">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
              <p className="text-muted-foreground text-sm">
                Enter your email or phone and we&apos;ll send you a code to reset your password
              </p>
            </div>

            <div className="flex rounded-lg bg-white/[0.03] p-1 mb-5">
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                  identifierType === "email" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setIdentifierType("email")}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                  identifierType === "phone" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setIdentifierType("phone")}
              >
                <Phone className="w-4 h-4" />
                Phone
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleRequestReset} className="space-y-4">
              {identifierType === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-muted-foreground">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-white/[0.04] border-white/10 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm text-muted-foreground">
                    Phone number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()-]/g, ""))}
                      className="pl-10 h-12 bg-white/[0.04] border-white/10 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 gradient-primary border-0 font-medium text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send Reset Code
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "verify" && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => {
                setStep("request");
                setOtp(["", "", "", "", "", ""]);
                setNewPassword("");
                setConfirmPassword("");
                setError(null);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Create new password</h1>
              <p className="text-muted-foreground text-sm">
                Enter the code sent to{" "}
                <span className="text-foreground font-medium">{maskedIdentifier}</span>
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Verification code</Label>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                  error={!!error}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm text-muted-foreground">
                  New password
                </Label>
                <PasswordInput
                  id="newPassword"
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  showStrength
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
                  Confirm password
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={confirmPassword && newPassword !== confirmPassword ? "Passwords do not match" : undefined}
                  required
                />
              </div>

              <Button
                onClick={handleVerifyAndReset}
                className="w-full h-12 gradient-primary border-0 font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                disabled={isLoading || otp.join("").length !== 6 || !newPassword || !confirmPassword}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Reset Password"
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-primary hover:text-primary/80"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password reset!</h1>
            <p className="text-muted-foreground text-sm mb-8">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full h-12 gradient-primary border-0 font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            >
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
