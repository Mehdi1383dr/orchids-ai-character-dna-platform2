"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dna, ArrowLeft, MessageSquare, FlaskConical, History, 
  Settings, Loader2, Brain, Heart, Sparkles, Users, Cog, Save
} from "lucide-react";
import { toast } from "sonner";
import type { CharacterDNA, TraitCategory } from "@/lib/types/character-dna";
import { TRAIT_DEFINITIONS } from "@/lib/types/character-dna";

const categoryIcons = {
  core: Brain,
  emotional: Heart,
  cognitive: Sparkles,
  social: Users,
  behavioral: Cog,
};

const categoryColors = {
  core: "from-violet-500 to-purple-600",
  emotional: "from-rose-500 to-pink-600",
  cognitive: "from-amber-500 to-orange-600",
  social: "from-emerald-500 to-teal-600",
  behavioral: "from-sky-500 to-blue-600",
};

export default function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [character, setCharacter] = useState<CharacterDNA | null>(null);
  const [editedTraits, setEditedTraits] = useState<CharacterDNA["traits"] | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("dna");

  useEffect(() => {
    const loadCharacter = async () => {
      try {
        const res = await fetch(`/api/characters/${id}`);
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Character not found");
          router.push("/dashboard");
          return;
        }

        setCharacter(data.character);
        setEditedTraits(JSON.parse(JSON.stringify(data.character.traits)));
      } catch {
        toast.error("Failed to load character");
      } finally {
        setIsLoading(false);
      }
    };

    loadCharacter();
  }, [id, router]);

  const updateTrait = (category: TraitCategory, key: string, value: number) => {
    if (!editedTraits) return;

    setEditedTraits((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: prev[category].map((t) =>
          t.key === key ? { ...t, value } : t
        ),
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!editedTraits || !hasChanges) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traits: editedTraits,
          changeReason: "Manual DNA edit",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to save changes");
        return;
      }

      setCharacter((prev) =>
        prev ? { ...prev, version: data.version, traits: data.traits } : prev
      );
      setHasChanges(false);
      toast.success("DNA updated successfully");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!character) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.75_0.18_280_/_0.08),transparent_50%)]" />
      
      <nav className="relative z-10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          
          {hasChanges && (
            <Button
              onClick={handleSave}
              className="gradient-primary border-0"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[280px,1fr] gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="glass rounded-xl p-6 text-center">
              <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl font-bold text-white">{character.name[0]}</span>
              </div>
              <h1 className="text-xl font-bold mb-1">{character.name}</h1>
              <p className="text-sm text-muted-foreground mb-4">Version {character.version}</p>
              
              {character.isDemo && (
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-accent/10 text-accent">
                  Demo Character
                </span>
              )}
            </div>

            <div className="glass rounded-xl p-4 space-y-2">
              <button
                onClick={() => setActiveTab("dna")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  activeTab === "dna" ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                }`}
              >
                <Dna className="w-5 h-5 text-primary" />
                <span className="font-medium">DNA Editor</span>
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  activeTab === "chat" ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                }`}
              >
                <MessageSquare className="w-5 h-5 text-chart-3" />
                <span className="font-medium">Chat</span>
              </button>
              <button
                onClick={() => setActiveTab("simulate")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  activeTab === "simulate" ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                }`}
              >
                <FlaskConical className="w-5 h-5 text-accent" />
                <span className="font-medium">Simulate</span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  activeTab === "history" ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                }`}
              >
                <History className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Version History</span>
              </button>
              {!character.isDemo && (
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    activeTab === "settings" ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                  }`}
                >
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">Settings</span>
                </button>
              )}
            </div>

            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3">DNA Summary</h3>
              <div className="space-y-2">
                {(Object.keys(categoryIcons) as TraitCategory[]).map((cat) => {
                  const Icon = categoryIcons[cat];
                  const avgValue = Math.round(
                    (editedTraits?.[cat] || character.traits[cat]).reduce((acc, t) => acc + t.value, 0) /
                    (editedTraits?.[cat] || character.traits[cat]).length
                  );
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${categoryColors[cat]} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${categoryColors[cat]}`}
                            style={{ width: `${avgValue}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{avgValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {activeTab === "dna" && editedTraits && (
              <div className="glass rounded-xl p-6">
                <Tabs defaultValue="core">
                  <TabsList className="mb-6">
                    {(Object.keys(categoryIcons) as TraitCategory[]).map((cat) => (
                      <TabsTrigger key={cat} value={cat} className="capitalize gap-2">
                        {(() => {
                          const Icon = categoryIcons[cat];
                          return <Icon className="w-4 h-4" />;
                        })()}
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {(Object.keys(categoryIcons) as TraitCategory[]).map((cat) => (
                    <TabsContent key={cat} value={cat} className="space-y-6">
                      {TRAIT_DEFINITIONS.filter(t => t.category === cat).map((trait) => {
                        const currentValue = editedTraits[cat].find(t => t.key === trait.key)?.value || 50;
                        return (
                          <div key={trait.key} className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <label className="font-medium">{trait.label}</label>
                                <p className="text-xs text-muted-foreground">{trait.description}</p>
                              </div>
                              <span className="text-lg font-semibold tabular-nums">{currentValue}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground w-24">{trait.opposites[0]}</span>
                              <Slider
                                value={[currentValue]}
                                onValueChange={([v]) => updateTrait(cat, trait.key, v)}
                                max={100}
                                step={1}
                                className="flex-1"
                                disabled={character.isDemo}
                              />
                              <span className="text-xs text-muted-foreground w-24 text-right">{trait.opposites[1]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>
                  ))}
                </Tabs>

                {character.isDemo && (
                  <div className="mt-6 p-4 rounded-lg bg-accent/10 border border-accent/20 text-center">
                    <p className="text-sm text-muted-foreground">
                      Demo characters are read-only. Create your own to edit DNA.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "chat" && (
              <div className="glass rounded-xl p-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Chat with {character.name}</h3>
                <p className="text-muted-foreground mb-6">
                  Start a conversation to experience this character&apos;s personality.
                </p>
                <Button className="gradient-primary border-0">
                  Start Chat (1 token/message)
                </Button>
              </div>
            )}

            {activeTab === "simulate" && (
              <div className="glass rounded-xl p-12 text-center">
                <FlaskConical className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Simulation Lab</h3>
                <p className="text-muted-foreground mb-6">
                  Test {character.name}&apos;s behavior in isolated scenarios.
                </p>
                <Button className="gradient-primary border-0">
                  Launch Simulation (20 tokens)
                </Button>
              </div>
            )}

            {activeTab === "history" && (
              <div className="glass rounded-xl p-12 text-center">
                <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Version History</h3>
                <p className="text-muted-foreground">
                  Current version: {character.version}
                </p>
              </div>
            )}

            {activeTab === "settings" && !character.isDemo && (
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Character Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Public Profile</p>
                      <p className="text-sm text-muted-foreground">Allow others to discover this character</p>
                    </div>
                    <Button variant="outline" size="sm">Toggle</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div>
                      <p className="font-medium text-destructive">Delete Character</p>
                      <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                    </div>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
