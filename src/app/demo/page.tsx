"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dna, ArrowLeft, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import type { CharacterDNA } from "@/lib/types/character-dna";

export default function DemoPage() {
  const [characters, setCharacters] = useState<CharacterDNA[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDemoCharacters = async () => {
      try {
        const res = await fetch("/api/characters/demo");
        const data = await res.json();
        setCharacters(data.characters || []);
      } catch (error) {
        console.error("Failed to load demo characters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDemoCharacters();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.75_0.18_280_/_0.15),transparent_50%)]" />
      
      <nav className="relative z-10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
          
          <Link href="/auth/signup">
            <Button size="sm" className="gradient-primary border-0">
              Create Account
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
            <Dna className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Demo Characters</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Explore these pre-built characters to see how DNA traits shape personality.
            Sign up to create your own.
          </p>
        </motion.div>

        {characters.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-6">
              Demo characters are being set up. Check back soon!
            </p>
            <Link href="/auth/signup">
              <Button className="gradient-primary border-0">
                Create Your Own Character
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((char, i) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
              >
                <Link href={`/characters/${char.id}`}>
                  <div className="glass rounded-xl p-6 hover:border-primary/30 transition-all cursor-pointer group h-full">
                    <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <span className="text-2xl font-bold text-white">{char.name[0]}</span>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">{char.name}</h3>
                    
                    <div className="space-y-3 mb-4">
                      {char.traits.core.slice(0, 3).map((trait) => (
                        <div key={trait.key} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground capitalize w-20">{trait.key}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div 
                              className="h-full rounded-full gradient-primary"
                              style={{ width: `${trait.value}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-6 text-right">{trait.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Button variant="ghost" size="sm" className="w-full" asChild>
                        <span>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Explore DNA
                        </span>
                      </Button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16"
        >
          <div className="glass rounded-2xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">Ready to Create Your Own?</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Sign up now to build characters with your own custom DNA traits.
                Start with 100 free tokens.
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="gradient-primary border-0 h-12 px-8">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
