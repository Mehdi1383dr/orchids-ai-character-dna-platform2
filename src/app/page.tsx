"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dna, Sparkles, Brain, FlaskConical, Shield, Zap, ArrowRight, Play } from "lucide-react";

const features = [
  {
    icon: Dna,
    title: "Character DNA",
    description: "Personality stored as structured data with 25+ traits across 5 categories, fully versioned and explainable.",
  },
  {
    icon: Brain,
    title: "Intelligent Behavior",
    description: "Traits influence responses naturally. High empathy + low patience creates caring but direct characters.",
  },
  {
    icon: FlaskConical,
    title: "Simulation Lab",
    description: "Test character behavior in isolated scenarios without affecting live state. Perfect for refinement.",
  },
  {
    icon: Sparkles,
    title: "Gradual Evolution",
    description: "Characters evolve through interaction while maintaining consistency. Every change is versioned.",
  },
  {
    icon: Shield,
    title: "Backend-First",
    description: "All logic enforced server-side. Tokens, subscriptions, and access verified at the API layer.",
  },
  {
    icon: Zap,
    title: "Token Economy",
    description: "Transparent costs for every action. Chat, create, edit, simulate—you control your spending.",
  },
];

const demoCharacters = [
  {
    name: "Nova",
    role: "Creative Mentor",
    traits: ["High Creativity", "Warm", "Curious"],
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    name: "Atlas",
    role: "Strategic Advisor",
    traits: ["Analytical", "Decisive", "Direct"],
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    name: "Echo",
    role: "Empathic Listener",
    traits: ["Empathetic", "Patient", "Supportive"],
    gradient: "from-amber-500 to-orange-500",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.75_0.18_280_/_0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.22_320_/_0.1),transparent_50%)]" />
      
      <nav className="relative z-10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Dna className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">CharacterDNA</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="gradient-primary border-0">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Characters are systems, not prompts</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Build AI Characters
              <br />
              <span className="gradient-text">With Real DNA</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Create intelligent AI personas with structured personality traits. 
              Every behavior is explainable, every evolution is tracked, 
              every simulation is isolated.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="gradient-primary border-0 h-12 px-8 text-base glow-primary">
                  Start Building Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  <Play className="w-4 h-4 mr-2" />
                  Try Demo Characters
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-24 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass rounded-2xl p-8 max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                {demoCharacters.map((char, i) => (
                  <motion.div
                    key={char.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                    className="glass rounded-xl p-6 hover:border-primary/30 transition-colors cursor-pointer group"
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${char.gradient} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                      <span className="text-2xl font-bold text-white">{char.name[0]}</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{char.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{char.role}</p>
                    <div className="flex flex-wrap gap-2">
                      {char.traits.map((trait) => (
                        <span key={trait} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="py-24 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Characters Built Different
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Not just prompts with personas. Structured systems with explainable behavior.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="glass rounded-xl p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass rounded-2xl p-12 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Create?
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                  Start with 100 free tokens. No credit card required. 
                  Build your first character in minutes.
                </p>
                <Link href="/auth/signup">
                  <Button size="lg" className="gradient-primary border-0 h-12 px-8 text-base glow-primary">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded gradient-primary flex items-center justify-center">
                <Dna className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">CharacterDNA</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Build intelligent AI characters with structured personality DNA.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
