"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dna, ArrowRight, ArrowLeft, Loader2, Sparkles, Users, Zap, Check } from "lucide-react";
import { toast } from "sonner";

const steps = [
  {
    title: "Welcome to CharacterDNA",
    description: "Let's set up your account and get you started.",
  },
  {
    title: "What brings you here?",
    description: "Help us personalize your experience.",
  },
  {
    title: "You're all set!",
    description: "Start building your first character.",
  },
];

const useCases = [
  { id: "storytelling", label: "Storytelling & Writing", icon: Sparkles },
  { id: "gaming", label: "Game Development", icon: Users },
  { id: "assistants", label: "AI Assistants", icon: Zap },
  { id: "education", label: "Education & Training", icon: Dna },
  { id: "other", label: "Something Else", icon: Check },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (step === 0 && !displayName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      try {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName,
            onboardingCompleted: true,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to update profile");
        }

        toast.success("Welcome to CharacterDNA!");
        router.push("/dashboard");
      } catch {
        toast.error("Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const toggleUseCase = (id: string) => {
    setSelectedUseCases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.75_0.18_280_/_0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.22_320_/_0.1),transparent_50%)]" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Dna className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-xl">CharacterDNA</span>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-16 rounded-full transition-colors ${
                i <= step ? "gradient-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl p-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">{steps[step].title}</h1>
              <p className="text-muted-foreground">{steps[step].description}</p>
            </div>

            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">What should we call you?</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-12 text-center text-lg"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                {useCases.map((useCase) => (
                  <button
                    key={useCase.id}
                    onClick={() => toggleUseCase(useCase.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      selectedUseCases.includes(useCase.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedUseCases.includes(useCase.id)
                          ? "gradient-primary"
                          : "bg-secondary"
                      }`}
                    >
                      <useCase.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium">{useCase.label}</span>
                    {selectedUseCases.includes(useCase.id) && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <div className="text-2xl font-bold gradient-text">100</div>
                    <div className="text-xs text-muted-foreground">Free Tokens</div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <div className="text-2xl font-bold gradient-text">3</div>
                    <div className="text-xs text-muted-foreground">Demo Characters</div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <div className="text-2xl font-bold gradient-text">25+</div>
                    <div className="text-xs text-muted-foreground">DNA Traits</div>
                  </div>
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  You&apos;re starting with 100 free tokens. Explore demo characters 
                  or upgrade to create your own.
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 h-11"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className={`h-11 gradient-primary border-0 ${step === 0 ? "w-full" : "flex-1"}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === steps.length - 1 ? (
                  <>
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
