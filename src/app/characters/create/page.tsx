"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Dna, ArrowLeft, ArrowRight, Loader2, Sparkles, Wand2, 
  Settings2, Brain, Heart, Zap, Check, AlertTriangle,
  User, Shield, Moon, Sun, Battery, Coffee, Palette,
  Clock, Activity, Waves, Flame, Eye, Link2, MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { 
  DNA_LAYER_DEFINITIONS, 
  EXTENDED_TRAIT_DEFINITIONS,
  BEHAVIORAL_PROFILES,
  type DNALayer,
  type ExtendedDNATrait,
  type BehavioralProfileType,
} from "@/lib/types/extended-dna";
import {
  type GenderExpression,
  type AttachmentStyle,
  type SocialBoundaryLevel,
  type IntimacyComfort,
  type CycleType,
  type InternalState,
  DEFAULT_INTERNAL_STATE,
  DEFAULT_IDENTITY_EXPRESSION,
  SAFETY_DISCLAIMERS,
} from "@/lib/types/internal-state";

const layerIcons: Record<DNALayer, typeof Brain> = {
  personality: User,
  cognitive: Brain,
  emotional_regulation: Heart,
  neuro_behavioral: Zap,
};

const layerColors: Record<DNALayer, string> = {
  personality: "text-violet-500",
  cognitive: "text-amber-500",
  emotional_regulation: "text-rose-500",
  neuro_behavioral: "text-cyan-500",
};

const cycleIcons: Record<CycleType, typeof Sun> = {
  circadian: Sun,
  energy_wave: Battery,
  focus_rhythm: Eye,
  emotional_tide: Waves,
  hormonal_rhythm: Moon,
  creativity_flow: Palette,
  social_recharge: MessageCircle,
};

const cycleDescriptions: Record<CycleType, { name: string; description: string; period: string }> = {
  circadian: { name: "Daily Rhythm", description: "Natural daily energy and focus patterns", period: "24 hours" },
  energy_wave: { name: "Energy Wave", description: "Multi-day energy fluctuation pattern", period: "10 days" },
  focus_rhythm: { name: "Focus Rhythm", description: "Concentration and attention patterns", period: "6 days" },
  emotional_tide: { name: "Emotional Tide", description: "Emotional sensitivity fluctuations", period: "9 days" },
  hormonal_rhythm: { name: "Monthly Rhythm", description: "Cyclical behavioral pattern (feminine)", period: "28 days" },
  creativity_flow: { name: "Creativity Flow", description: "Creative energy patterns", period: "7 days" },
  social_recharge: { name: "Social Recharge", description: "Social energy cycles", period: "5 days" },
};

const genderOptions: { value: GenderExpression; label: string; icon: typeof User }[] = [
  { value: "feminine", label: "Feminine", icon: User },
  { value: "masculine", label: "Masculine", icon: User },
  { value: "androgynous", label: "Androgynous", icon: User },
  { value: "fluid", label: "Fluid", icon: User },
  { value: "neutral", label: "Neutral", icon: User },
];

const attachmentOptions: { value: AttachmentStyle; label: string; description: string }[] = [
  { value: "secure", label: "Secure", description: "Comfortable with intimacy and autonomy" },
  { value: "anxious", label: "Anxious", description: "Seeks closeness, fears rejection" },
  { value: "avoidant", label: "Avoidant", description: "Values independence, cautious with closeness" },
  { value: "disorganized", label: "Disorganized", description: "Mixed feelings about closeness" },
];

const boundaryOptions: { value: SocialBoundaryLevel; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "moderate", label: "Moderate" },
  { value: "guarded", label: "Guarded" },
  { value: "closed", label: "Closed" },
];

const intimacyOptions: { value: IntimacyComfort; label: string }[] = [
  { value: "very_comfortable", label: "Very Comfortable" },
  { value: "comfortable", label: "Comfortable" },
  { value: "cautious", label: "Cautious" },
  { value: "reserved", label: "Reserved" },
  { value: "avoidant", label: "Avoidant" },
];

type TraitValues = Record<string, number>;

export default function CreateCharacterPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [mode, setMode] = useState<"standard" | "advanced" | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [traits, setTraits] = useState<TraitValues>(() => {
    const initial: TraitValues = {};
    EXTENDED_TRAIT_DEFINITIONS.forEach(t => {
      initial[t.traitKey] = t.traitValue;
    });
    return initial;
  });
  const [selectedProfiles, setSelectedProfiles] = useState<BehavioralProfileType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState<DNALayer>("personality");
  const [activeTab, setActiveTab] = useState<"dna" | "identity" | "cycles" | "state">("dna");

  const [genderExpression, setGenderExpression] = useState<GenderExpression>(DEFAULT_IDENTITY_EXPRESSION.genderExpression);
  const [pronouns, setPronouns] = useState<string>(DEFAULT_IDENTITY_EXPRESSION.pronouns.join("/"));
  const [attachmentStyle, setAttachmentStyle] = useState<AttachmentStyle>(DEFAULT_IDENTITY_EXPRESSION.attachmentStyle);
  const [socialBoundaries, setSocialBoundaries] = useState<SocialBoundaryLevel>(DEFAULT_IDENTITY_EXPRESSION.socialBoundaries);
  const [intimacyTolerance, setIntimacyTolerance] = useState<IntimacyComfort>(DEFAULT_IDENTITY_EXPRESSION.intimacyTolerance);
  const [emotionalOpenness, setEmotionalOpenness] = useState(DEFAULT_IDENTITY_EXPRESSION.emotionalOpennessDefault);
  const [vulnerabilityComfort, setVulnerabilityComfort] = useState(DEFAULT_IDENTITY_EXPRESSION.vulnerabilityComfort);

  const [enabledCycles, setEnabledCycles] = useState<CycleType[]>(["circadian", "energy_wave"]);
  
  const [initialState, setInitialState] = useState<InternalState>({ ...DEFAULT_INTERNAL_STATE });

  const updateTrait = (key: string, value: number) => {
    setTraits(prev => ({ ...prev, [key]: value }));
  };

  const toggleProfile = (profileType: BehavioralProfileType) => {
    setSelectedProfiles(prev =>
      prev.includes(profileType)
        ? prev.filter(p => p !== profileType)
        : [...prev, profileType]
    );
  };

  const toggleCycle = (cycleType: CycleType) => {
    if (cycleType === "hormonal_rhythm" && genderExpression !== "feminine") {
      toast.error("Monthly rhythm requires feminine gender expression");
      return;
    }
    setEnabledCycles(prev =>
      prev.includes(cycleType)
        ? prev.filter(c => c !== cycleType)
        : [...prev, cycleType]
    );
  };

  const updateInitialState = (key: keyof InternalState, value: number) => {
    setInitialState(prev => ({ ...prev, [key]: value }));
  };

  const getTraitsByLayer = (layer: DNALayer) => {
    return EXTENDED_TRAIT_DEFINITIONS.filter(t => t.layer === layer);
  };

  const derivedMood = useMemo(() => {
    const valence = (initialState.emotionalBaseline - 50) / 50;
    const energy = initialState.energyLevel / 100;
    const fatigue = initialState.mentalFatigue / 100;

    let mood: string;
    if (fatigue > 0.7 || initialState.restNeed > 70) mood = "Tired";
    else if (initialState.stressAccumulation > 60) mood = "Stressed";
    else if (initialState.boredomLevel > 70) mood = "Bored";
    else if (valence > 0.3 && energy > 0.6) mood = "Happy";
    else if (valence < -0.3 && energy < 0.4) mood = "Melancholic";
    else if (energy > 0.7 && initialState.creativeDrive > 60) mood = "Inspired";
    else if (initialState.socialBattery < 30) mood = "Withdrawn";
    else mood = "Neutral";

    return mood;
  }, [initialState]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a character name");
      return;
    }

    if (!session?.accessToken) {
      toast.error("Please log in to create a character");
      router.push("/auth/login");
      return;
    }

    setIsLoading(true);
    try {
      const traitData: Record<string, Array<{ traitKey: string; traitValue: number }>> = {
        personality: [],
        cognitive: [],
        emotional_regulation: [],
        neuro_behavioral: [],
      };

      EXTENDED_TRAIT_DEFINITIONS.forEach(t => {
        if (traitData[t.layer]) {
          traitData[t.layer].push({
            traitKey: t.traitKey,
            traitValue: traits[t.traitKey] ?? t.traitValue,
          });
        }
      });

      const res = await fetch("/api/characters/v2", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ 
          name, 
          publicDescription: description,
          creationMode: mode,
          initialDNA: {
            core: traitData.personality.map(t => ({ ...t, category: "core" as const })),
            emotional: traitData.emotional_regulation.map(t => ({ ...t, category: "emotional" as const })),
            cognitive: traitData.cognitive.map(t => ({ ...t, category: "cognitive" as const })),
            behavioral: traitData.neuro_behavioral.map(t => ({ ...t, category: "behavioral" as const })),
            social: [],
          },
          identityExpression: {
            genderExpression,
            pronouns: pronouns.split("/").map(p => p.trim()),
            attachmentStyle,
            socialBoundaries,
            intimacyTolerance,
            emotionalOpennessDefault: emotionalOpenness,
            vulnerabilityComfort,
          },
          enabledCycles,
          initialState,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create character");
        return;
      }

      if (selectedProfiles.length > 0) {
        for (const profileType of selectedProfiles) {
          await fetch(`/api/characters/v2/${data.character.id}/profiles`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({ profileType }),
          });
        }
      }

      toast.success("Character created!");
      router.push(`/characters/${data.character.id}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        </div>
        
        <nav className="relative z-10 border-b border-white/5 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>
          </div>
        </nav>

        <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-500/25"
            >
              <Dna className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Create Your Character</h1>
            <p className="text-slate-400 max-w-lg mx-auto text-lg">
              Build a unique AI personality with deep cognitive-behavioral DNA, 
              internal states, and human-like cycles.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <motion.button
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setMode("standard")}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-violet-500/50 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/25">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Standard Mode</h2>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Shape your character through guided steps. Perfect for creating 
                  well-balanced personalities with natural evolution.
                </p>
                <div className="flex items-center gap-2 text-violet-400 font-medium">
                  <span>Recommended for beginners</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setMode("advanced")}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-cyan-500/50 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/25">
                  <Settings2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Advanced Mode</h2>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Full control over DNA traits, internal states, cycles, 
                  and identity expression for complex characters.
                </p>
                <div className="flex items-center gap-2 text-cyan-400 font-medium">
                  <span>Complete customization</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/30 backdrop-blur-xl rounded-3xl p-8 border border-white/5"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <Brain className="w-6 h-6 text-violet-400" />
              Character Systems
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Dna, color: "violet", label: "4-Layer DNA", desc: "Personality, Cognitive, Emotional, Behavioral" },
                { icon: Activity, color: "rose", label: "Internal States", desc: "Energy, Fatigue, Mood, Stress" },
                { icon: Waves, color: "cyan", label: "Behavioral Cycles", desc: "Daily rhythms & emotional tides" },
                { icon: User, color: "amber", label: "Identity Expression", desc: "Gender, pronouns, attachment style" },
              ].map((item, i) => (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="p-4 rounded-2xl bg-slate-900/50 border border-white/5"
                >
                  <item.icon className={`w-5 h-5 text-${item.color}-400 mb-3`} />
                  <p className="font-semibold text-white text-sm mb-1">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (mode === "standard") {
    const standardSteps = [
      { title: "Name & Identity", description: "Give your character an identity", icon: User },
      { title: "Core Personality", description: "Define fundamental traits", icon: Heart },
      { title: "Mental Patterns", description: "Shape cognitive processes", icon: Brain },
      { title: "Inner World", description: "Set initial internal states", icon: Activity },
      { title: "Life Rhythms", description: "Configure behavioral cycles", icon: Waves },
      { title: "Review & Create", description: "Finalize your character", icon: Sparkles },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
        </div>
        
        <nav className="relative z-10 border-b border-white/5 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
            <button 
              onClick={() => step === 0 ? setMode(null) : setStep(step - 1)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        </nav>

        <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
          <div className="flex justify-center gap-2 mb-10">
            {standardSteps.map((s, i) => (
              <div key={i} className="flex items-center">
                <motion.div
                  initial={false}
                  animate={{ 
                    scale: i === step ? 1.2 : 1,
                    backgroundColor: i <= step ? "rgb(139 92 246)" : "rgb(51 65 85)"
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === step ? "ring-4 ring-violet-500/20" : ""
                  }`}
                />
                {i < standardSteps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${i < step ? "bg-violet-500" : "bg-slate-700"}`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
            >
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4">
                  {(() => {
                    const StepIcon = standardSteps[step].icon;
                    return <StepIcon className="w-7 h-7 text-white" />;
                  })()}
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{standardSteps[step].title}</h1>
                <p className="text-slate-400">{standardSteps[step].description}</p>
              </div>

              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-white mb-2 block">Character Name</Label>
                    <Input
                      placeholder="Enter a name..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 text-lg bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-white mb-2 block">Description (optional)</Label>
                    <Input
                      placeholder="A brief description..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <Label className="text-white mb-3 block">Gender Expression</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {genderOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setGenderExpression(opt.value)}
                          className={`p-3 rounded-xl text-sm font-medium transition-all ${
                            genderExpression === opt.value
                              ? "bg-violet-500 text-white"
                              : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-white mb-2 block">Pronouns</Label>
                    <Input
                      placeholder="they/them"
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  {getTraitsByLayer("personality").slice(0, 4).map((trait) => (
                    <TraitSlider
                      key={trait.traitKey}
                      trait={trait}
                      value={traits[trait.traitKey] ?? 50}
                      onChange={(v) => updateTrait(trait.traitKey, v)}
                    />
                  ))}
                  <div className="pt-4 border-t border-white/10">
                    <Label className="text-white mb-3 block">Attachment Style</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {attachmentOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setAttachmentStyle(opt.value)}
                          className={`p-3 rounded-xl text-left transition-all ${
                            attachmentStyle === opt.value
                              ? "bg-violet-500/20 border-2 border-violet-500 text-white"
                              : "bg-slate-900/50 border-2 border-transparent text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className="text-xs opacity-70 mt-0.5">{opt.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {getTraitsByLayer("cognitive").slice(0, 4).map((trait) => (
                    <TraitSlider
                      key={trait.traitKey}
                      trait={trait}
                      value={traits[trait.traitKey] ?? 50}
                      onChange={(v) => updateTrait(trait.traitKey, v)}
                    />
                  ))}
                  {getTraitsByLayer("emotional_regulation").slice(0, 2).map((trait) => (
                    <TraitSlider
                      key={trait.traitKey}
                      trait={trait}
                      value={traits[trait.traitKey] ?? 50}
                      onChange={(v) => updateTrait(trait.traitKey, v)}
                    />
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <StateSlider
                    label="Energy Level"
                    icon={Battery}
                    value={initialState.energyLevel}
                    onChange={(v) => updateInitialState("energyLevel", v)}
                    colorClass="text-green-400"
                  />
                  <StateSlider
                    label="Mental Fatigue"
                    icon={Coffee}
                    value={initialState.mentalFatigue}
                    onChange={(v) => updateInitialState("mentalFatigue", v)}
                    colorClass="text-amber-400"
                    inverted
                  />
                  <StateSlider
                    label="Emotional Baseline"
                    icon={Heart}
                    value={initialState.emotionalBaseline}
                    onChange={(v) => updateInitialState("emotionalBaseline", v)}
                    colorClass="text-rose-400"
                  />
                  <StateSlider
                    label="Stress Level"
                    icon={Flame}
                    value={initialState.stressAccumulation}
                    onChange={(v) => updateInitialState("stressAccumulation", v)}
                    colorClass="text-red-400"
                    inverted
                  />
                  <StateSlider
                    label="Social Battery"
                    icon={MessageCircle}
                    value={initialState.socialBattery}
                    onChange={(v) => updateInitialState("socialBattery", v)}
                    colorClass="text-cyan-400"
                  />
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">Derived Mood</p>
                    <p className="text-lg font-semibold text-white">{derivedMood}</p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 mb-4">
                    Enable behavioral cycles that influence your character&apos;s mood, energy, and focus over time.
                  </p>
                  {(["circadian", "energy_wave", "focus_rhythm", "emotional_tide"] as CycleType[]).map(cycle => {
                    const info = cycleDescriptions[cycle];
                    const Icon = cycleIcons[cycle];
                    const isEnabled = enabledCycles.includes(cycle);
                    return (
                      <button
                        key={cycle}
                        onClick={() => toggleCycle(cycle)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                          isEnabled
                            ? "bg-violet-500/20 border-2 border-violet-500"
                            : "bg-slate-900/50 border-2 border-transparent hover:bg-slate-800"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isEnabled ? "bg-violet-500" : "bg-slate-800"
                        }`}>
                          <Icon className={`w-5 h-5 ${isEnabled ? "text-white" : "text-slate-500"}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isEnabled ? "text-white" : "text-slate-300"}`}>{info.name}</p>
                          <p className="text-xs text-slate-500">{info.description} • {info.period}</p>
                        </div>
                        <Switch checked={isEnabled} />
                      </button>
                    );
                  })}
                  {genderExpression === "feminine" && (
                    <button
                      onClick={() => toggleCycle("hormonal_rhythm")}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                        enabledCycles.includes("hormonal_rhythm")
                          ? "bg-fuchsia-500/20 border-2 border-fuchsia-500"
                          : "bg-slate-900/50 border-2 border-transparent hover:bg-slate-800"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        enabledCycles.includes("hormonal_rhythm") ? "bg-fuchsia-500" : "bg-slate-800"
                      }`}>
                        <Moon className={`w-5 h-5 ${enabledCycles.includes("hormonal_rhythm") ? "text-white" : "text-slate-500"}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${enabledCycles.includes("hormonal_rhythm") ? "text-white" : "text-slate-300"}`}>
                          Monthly Rhythm
                        </p>
                        <p className="text-xs text-slate-500">Cyclical behavioral pattern • 28 days</p>
                      </div>
                      <Switch checked={enabledCycles.includes("hormonal_rhythm")} />
                    </button>
                  )}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-4">
                    <p className="text-xs text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      {SAFETY_DISCLAIMERS.cycles}
                    </p>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
                      <span className="text-3xl font-bold text-white">{name[0] || "?"}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{name || "Unnamed"}</h3>
                    {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
                    <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
                      <span>{genderExpression}</span>
                      <span>•</span>
                      <span>{pronouns}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Energy" value={initialState.energyLevel} icon={Battery} color="green" />
                    <StatCard label="Mood" value={derivedMood} icon={Heart} color="rose" isText />
                    <StatCard label="Attachment" value={attachmentStyle} icon={Link2} color="violet" isText />
                    <StatCard label="Cycles" value={enabledCycles.length} icon={Waves} color="cyan" suffix="active" />
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-400">
                      All behavioral patterns are simulated for fictional characters only.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 h-12 bg-transparent border-white/10 text-white hover:bg-white/5"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={step === standardSteps.length - 1 ? handleCreate : () => setStep(step + 1)}
                  className={`h-12 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 border-0 ${step === 0 ? "w-full" : "flex-1"}`}
                  disabled={isLoading || (step === 0 && !name.trim())}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : step === standardSteps.length - 1 ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Character
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
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>
      
      <nav className="relative z-10 border-b border-white/5 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => setMode(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Change Mode</span>
          </button>
          
          <Button
            onClick={handleCreate}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 border-0"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Character
              </>
            )}
          </Button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[340px,1fr] gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
                <span className="text-4xl font-bold text-white">{name[0] || "?"}</span>
              </div>
              <Input
                placeholder="Character Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-center font-medium bg-slate-900/50 border-white/10 text-white"
              />
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-center text-sm mt-2 bg-slate-900/50 border-white/10 text-white"
              />
              
              <div className="mt-4 p-4 rounded-xl bg-slate-900/50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Mood</span>
                  <span className="text-white font-medium">{derivedMood}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Energy</span>
                  <span className="text-white font-medium">{initialState.energyLevel}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cycles</span>
                  <span className="text-white font-medium">{enabledCycles.length} active</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-4 border border-white/10">
              <div className="flex rounded-xl bg-slate-900/50 p-1 mb-4">
                {[
                  { key: "dna", label: "DNA", icon: Dna },
                  { key: "identity", label: "Identity", icon: User },
                  { key: "cycles", label: "Cycles", icon: Clock },
                  { key: "state", label: "State", icon: Activity },
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        activeTab === tab.key
                          ? "bg-violet-500 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {activeTab === "dna" && (
                <div className="space-y-2">
                  {(Object.keys(DNA_LAYER_DEFINITIONS) as DNALayer[]).map((layer) => {
                    const Icon = layerIcons[layer];
                    const def = DNA_LAYER_DEFINITIONS[layer];
                    return (
                      <button
                        key={layer}
                        onClick={() => setActiveLayer(layer)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          activeLayer === layer
                            ? "bg-violet-500/20 border border-violet-500/50"
                            : "hover:bg-slate-800 border border-transparent"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${layerColors[layer]}`} />
                        <span className={`font-medium text-sm ${activeLayer === layer ? "text-white" : "text-slate-300"}`}>
                          {def.name}
                        </span>
                        <span className="ml-auto text-xs text-slate-500">
                          {getTraitsByLayer(layer).length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "identity" && (
                <div className="space-y-4 p-2">
                  <div>
                    <Label className="text-slate-400 text-xs mb-2 block">Gender Expression</Label>
                    <select
                      value={genderExpression}
                      onChange={(e) => setGenderExpression(e.target.value as GenderExpression)}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                    >
                      {genderOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-2 block">Pronouns</Label>
                    <Input
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      className="bg-slate-900/50 border-white/10 text-white text-sm"
                      placeholder="they/them"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-2 block">Attachment Style</Label>
                    <select
                      value={attachmentStyle}
                      onChange={(e) => setAttachmentStyle(e.target.value as AttachmentStyle)}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                    >
                      {attachmentOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-2 block">Social Boundaries</Label>
                    <select
                      value={socialBoundaries}
                      onChange={(e) => setSocialBoundaries(e.target.value as SocialBoundaryLevel)}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                    >
                      {boundaryOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-2 block">Intimacy Comfort</Label>
                    <select
                      value={intimacyTolerance}
                      onChange={(e) => setIntimacyTolerance(e.target.value as IntimacyComfort)}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                    >
                      {intimacyOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "cycles" && (
                <div className="space-y-2">
                  {(Object.keys(cycleDescriptions) as CycleType[]).map(cycle => {
                    if (cycle === "hormonal_rhythm" && genderExpression !== "feminine") return null;
                    const info = cycleDescriptions[cycle];
                    const Icon = cycleIcons[cycle];
                    const isEnabled = enabledCycles.includes(cycle);
                    return (
                      <button
                        key={cycle}
                        onClick={() => toggleCycle(cycle)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isEnabled
                            ? "bg-violet-500/20 border border-violet-500/50"
                            : "hover:bg-slate-800 border border-transparent"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isEnabled ? "text-violet-400" : "text-slate-500"}`} />
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${isEnabled ? "text-white" : "text-slate-300"}`}>
                            {info.name}
                          </p>
                          <p className="text-xs text-slate-500">{info.period}</p>
                        </div>
                        <Switch checked={isEnabled} className="scale-75" />
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "state" && (
                <div className="space-y-4 p-2">
                  <MiniStateSlider
                    label="Energy"
                    value={initialState.energyLevel}
                    onChange={(v) => updateInitialState("energyLevel", v)}
                    color="green"
                  />
                  <MiniStateSlider
                    label="Fatigue"
                    value={initialState.mentalFatigue}
                    onChange={(v) => updateInitialState("mentalFatigue", v)}
                    color="amber"
                  />
                  <MiniStateSlider
                    label="Mood"
                    value={initialState.emotionalBaseline}
                    onChange={(v) => updateInitialState("emotionalBaseline", v)}
                    color="rose"
                  />
                  <MiniStateSlider
                    label="Stress"
                    value={initialState.stressAccumulation}
                    onChange={(v) => updateInitialState("stressAccumulation", v)}
                    color="red"
                  />
                  <MiniStateSlider
                    label="Social"
                    value={initialState.socialBattery}
                    onChange={(v) => updateInitialState("socialBattery", v)}
                    color="cyan"
                  />
                  <MiniStateSlider
                    label="Creativity"
                    value={initialState.creativeDrive}
                    onChange={(v) => updateInitialState("creativeDrive", v)}
                    color="violet"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-4 border border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 px-2">Behavioral Profiles</p>
              <div className="space-y-2">
                {BEHAVIORAL_PROFILES.slice(0, 4).map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => toggleProfile(profile.type)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
                      selectedProfiles.includes(profile.type)
                        ? "bg-cyan-500/20 border border-cyan-500/50"
                        : "hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedProfiles.includes(profile.type)
                        ? "bg-cyan-500 border-cyan-500"
                        : "border-slate-600"
                    }`}>
                      {selectedProfiles.includes(profile.type) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <span className={`font-medium text-sm block ${selectedProfiles.includes(profile.type) ? "text-white" : "text-slate-300"}`}>
                        {profile.name}
                      </span>
                      <span className="text-xs text-slate-500 line-clamp-2">{profile.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10"
          >
            <Tabs value={activeLayer} onValueChange={(v) => setActiveLayer(v as DNALayer)}>
              <TabsList className="mb-6 bg-slate-900/50 p-1 rounded-xl">
                {(Object.keys(DNA_LAYER_DEFINITIONS) as DNALayer[]).map((layer) => {
                  const Icon = layerIcons[layer];
                  return (
                    <TabsTrigger 
                      key={layer} 
                      value={layer} 
                      className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white rounded-lg"
                    >
                      <Icon className={`w-4 h-4`} />
                      {DNA_LAYER_DEFINITIONS[layer].name}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {(Object.keys(DNA_LAYER_DEFINITIONS) as DNALayer[]).map((layer) => (
                <TabsContent key={layer} value={layer} className="space-y-6">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/50 border border-white/5">
                    <Sparkles className={`w-5 h-5 ${layerColors[layer]}`} />
                    <p className="text-sm text-slate-400">
                      {DNA_LAYER_DEFINITIONS[layer].description}
                    </p>
                  </div>
                  
                  {getTraitsByLayer(layer).map((trait) => (
                    <TraitSlider
                      key={trait.traitKey}
                      trait={trait}
                      value={traits[trait.traitKey] ?? 50}
                      onChange={(v) => updateTrait(trait.traitKey, v)}
                      showAdvanced
                    />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function TraitSlider({
  trait,
  value,
  onChange,
  showAdvanced = false,
}: {
  trait: ExtendedDNATrait;
  value: number;
  onChange: (v: number) => void;
  showAdvanced?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <Label className="text-base text-white">{trait.label}</Label>
          <p className="text-xs text-slate-500">{trait.description}</p>
          {showAdvanced && trait.safetyFlags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {trait.safetyFlags.map((flag, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  {flag.type.replace("_", " ")}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-lg font-bold text-white tabular-nums">{value}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500 w-28">{trait.opposites[0]}</span>
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-xs text-slate-500 w-28 text-right">{trait.opposites[1]}</span>
      </div>
      {showAdvanced && (
        <div className="flex gap-4 text-xs text-slate-600">
          <span>Volatility: {(trait.volatility * 100).toFixed(0)}%</span>
          <span>Resistance: {(trait.resistance * 100).toFixed(0)}%</span>
          <span>Influence: {trait.influenceStrength.toFixed(1)}x</span>
        </div>
      )}
    </div>
  );
}

function StateSlider({
  label,
  icon: Icon,
  value,
  onChange,
  colorClass,
  inverted = false,
}: {
  label: string;
  icon: typeof Battery;
  value: number;
  onChange: (v: number) => void;
  colorClass: string;
  inverted?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <span className="text-sm text-white font-medium">{label}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${
          inverted 
            ? value > 60 ? "text-red-400" : value > 40 ? "text-amber-400" : "text-green-400"
            : value > 60 ? "text-green-400" : value > 40 ? "text-amber-400" : "text-red-400"
        }`}>
          {value}%
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={100}
        step={1}
      />
    </div>
  );
}

function MiniStateSlider({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-medium text-${color}-400`}>{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={100}
        step={1}
        className="h-1"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  isText = false,
  suffix,
}: {
  label: string;
  value: number | string;
  icon: typeof Battery;
  color: string;
  isText?: boolean;
  suffix?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
      <Icon className={`w-4 h-4 text-${color}-400 mb-2`} />
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-white">
        {isText ? value : `${value}${suffix ? ` ${suffix}` : "%"}`}
      </p>
    </div>
  );
}
