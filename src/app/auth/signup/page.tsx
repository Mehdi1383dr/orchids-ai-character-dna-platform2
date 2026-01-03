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
  Mail, Phone, User, ArrowRight, Loader2, Check, 
  ArrowLeft, RefreshCw, Shield, AlertCircle 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "credentials" | "otp";
type IdentifierType = "email" | "phone";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const [identifierType, setIdentifierType] = useState<IdentifierType>("email");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email: identifierType === "email" ? email : undefined,
          phone: identifierType === "phone" ? phone : undefined,
          password,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "object" ? data.error.message : data.error;
        setError(errorMsg || "Failed to sign up");
        return;
      }

      setMaskedIdentifier(data.identifier);
      setOtpExpiry(new Date(data.expiresAt));
      setStep("otp");
      setResendCooldown(60);
      toast.success("Verification code sent!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifierType === "email" ? email : phone,
          identifierType,
          code,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "object" ? data.error.message : data.error;
        setError(errorMsg || "Invalid code");
        setOtp(["", "", "", "", "", ""]);
        return;
      }

      if (data.session) {
        localStorage.setItem("auth_session", JSON.stringify(data.session));
      }

      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setError(null);
    const newKey = crypto.randomUUID();
    setIdempotencyKey(newKey);

    try {
      const res = await fetch("/api/auth/signup/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email: identifierType === "email" ? email : undefined,
          phone: identifierType === "phone" ? phone : undefined,
          password,
          idempotencyKey: newKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "object" ? data.error.message : data.error;
        setError(errorMsg || "Failed to resend code");
        return;
      }

      setOtp(["", "", "", "", "", ""]);
      setOtpExpiry(new Date(data.expiresAt));
      setResendCooldown(60);
      toast.success("New code sent!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === "credentials" ? (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Create your account</h1>
              <p className="text-muted-foreground text-sm">
                Start building AI characters in minutes
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <Button
                variant="outline"
                className="w-full h-12 justify-center gap-3 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all"
                onClick={() => handleOAuth("google")}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 justify-center gap-3 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all"
                onClick={() => handleOAuth("apple")}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
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

            <form onSubmit={handleInitiateSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm text-muted-foreground">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="pl-10 h-12 bg-white/[0.04] border-white/10 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                </div>
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-muted-foreground">
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  showStrength
                  required
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 gradient-primary border-0 font-medium text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => {
                setStep("credentials");
                setOtp(["", "", "", "", "", ""]);
                setError(null);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Verify your {identifierType}</h1>
              <p className="text-muted-foreground text-sm">
                We sent a 6-digit code to<br />
                <span className="text-foreground font-medium">{maskedIdentifier}</span>
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-6"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="mb-6">
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                disabled={isLoading}
                error={!!error}
              />
            </div>

            <Button
              onClick={() => handleVerifyOtp(otp.join(""))}
              className="w-full h-12 gradient-primary border-0 font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow mb-6"
              disabled={isLoading || otp.join("").length !== 6}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Verify & Create Account
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Didn&apos;t receive the code?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className="text-primary hover:text-primary/80"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </Button>
            </div>

            {otpExpiry && (
              <p className="text-xs text-center text-muted-foreground/60 mt-6">
                Code expires at {otpExpiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
