"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { 
  Dna, Plus, Coins, Crown, Settings, LogOut, Sparkles, 
  MessageSquare, FlaskConical, ChevronRight, Loader2, Shield
} from "lucide-react";
import type { CharacterDNA } from "@/lib/types/character-dna";

interface UserData {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
  subscription: {
    plan: string;
    status: string;
  } | null;
  tokenBalance: {
    balance: number;
    lifetime_spent: number;
  } | null;
  characterCount: number;
  isAdmin?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, session, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [characters, setCharacters] = useState<CharacterDNA[]>([]);
  const [demoCharacters, setDemoCharacters] = useState<CharacterDNA[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !session?.accessToken) {
      router.push("/auth/login");
      return;
    }

    const loadData = async () => {
      try {
        const headers: HeadersInit = {
          "Authorization": `Bearer ${session.accessToken}`,
        };

        const [userRes, charsRes, demoRes] = await Promise.all([
          fetch("/api/user", { headers }),
          fetch("/api/characters", { headers }),
          fetch("/api/characters/demo"),
        ]);

        const [userDataRes, charsData, demoData] = await Promise.all([
          userRes.json(),
          charsRes.json(),
          demoRes.json(),
        ]);

        setUserData(userDataRes);
        setCharacters(charsData.characters || []);
        setDemoCharacters(demoData.characters || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [authLoading, isAuthenticated, session, router]);

  const handleSignOut = async () => {
    await logout();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const canCreate = userData?.subscription?.plan !== "free";
  const allCharacters = [...characters, ...demoCharacters];

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.75_0.18_280_/_0.08),transparent_50%)]" />
      
      <nav className="relative z-10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Dna className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">CharacterDNA</span>
          </Link>
          
            <div className="flex items-center gap-4">
              {userData?.isAdmin && (
                <Link href="/admin/economy">
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Shield className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                </Link>
              )}
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                <Coins className="w-4 h-4 text-primary" />
                <span className="font-medium">{userData?.tokenBalance?.balance || 0}</span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                <Crown className="w-4 h-4 text-accent" />
                <span className="text-sm capitalize">{userData?.subscription?.plan || "free"}</span>
              </div>

            <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
              <Settings className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{user?.displayName || userData?.profile?.display_name ? `, ${user?.displayName || userData?.profile?.display_name}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Manage your characters and explore their DNA.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Token Balance</p>
                <p className="text-2xl font-bold">{userData?.tokenBalance?.balance || 0}</p>
              </div>
            </div>
            <Link href="/tokens">
              <Button variant="outline" size="sm" className="w-full">
                Get More Tokens
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Dna className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Characters</p>
                <p className="text-2xl font-bold">{userData?.characterCount || 0}</p>
              </div>
            </div>
            {canCreate ? (
              <Link href="/characters/create">
                <Button size="sm" className="w-full gradient-primary border-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Character
                </Button>
              </Link>
            ) : (
              <Link href="/pricing">
                <Button variant="outline" size="sm" className="w-full">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Create
                </Button>
              </Link>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Simulations</p>
                <p className="text-2xl font-bold">Lab</p>
              </div>
            </div>
            <Link href="/simulations">
              <Button variant="outline" size="sm" className="w-full">
                Open Lab
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Your Characters</h2>
            {canCreate && (
              <Link href="/characters/create">
                <Button size="sm" className="gradient-primary border-0">
                  <Plus className="w-4 h-4 mr-2" />
                  New Character
                </Button>
              </Link>
            )}
          </div>

          {allCharacters.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Characters Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {canCreate 
                  ? "Create your first AI character with structured personality DNA."
                  : "Upgrade to a paid plan to create your own characters, or explore demo characters below."}
              </p>
              {canCreate ? (
                <Link href="/characters/create">
                  <Button className="gradient-primary border-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Character
                  </Button>
                </Link>
              ) : (
                <Link href="/pricing">
                  <Button className="gradient-primary border-0">
                    <Crown className="w-4 h-4 mr-2" />
                    View Plans
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCharacters.map((char, i) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                >
                  <Link href={`/characters/${char.id}`}>
                    <div className="glass rounded-xl p-5 hover:border-primary/30 transition-all group cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <span className="text-xl font-bold text-white">{char.name[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{char.name}</h3>
                            {char.isDemo && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                                Demo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">v{char.version}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <div className="flex-1 text-center p-2 rounded-lg bg-secondary/50">
                          <div className="text-xs text-muted-foreground">Core</div>
                          <div className="font-medium">{char.traits.core.length}</div>
                        </div>
                        <div className="flex-1 text-center p-2 rounded-lg bg-secondary/50">
                          <div className="text-xs text-muted-foreground">Emotional</div>
                          <div className="font-medium">{char.traits.emotional.length}</div>
                        </div>
                        <div className="flex-1 text-center p-2 rounded-lg bg-secondary/50">
                          <div className="text-xs text-muted-foreground">Social</div>
                          <div className="font-medium">{char.traits.social.length}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                        <Button variant="ghost" size="sm" className="flex-1 h-8" asChild>
                          <span>
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                            Chat
                          </span>
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 h-8" asChild>
                          <span>
                            <Dna className="w-3.5 h-3.5 mr-1.5" />
                            DNA
                          </span>
                        </Button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
