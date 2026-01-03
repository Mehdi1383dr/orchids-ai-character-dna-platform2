"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Dna, ArrowLeft, Check, X, Sparkles, Zap, Crown, 
  Building2, MessageSquare, Brain, FlaskConical, Cpu, 
  Infinity, ArrowRight
} from "lucide-react";
import { useState } from "react";

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Explore demo characters",
    price: 0,
    period: "forever",
    tokens: 50,
    tokenNote: "one-time",
    highlight: false,
    cta: "Get Started",
    features: [
      { text: "Chat with 3 demo characters", included: true },
      { text: "50 tokens (one-time)", included: true },
      { text: "View DNA structures", included: true },
      { text: "Create own characters", included: false },
      { text: "Edit character DNA", included: false },
      { text: "Simulation lab", included: false },
      { text: "Fine-tuning", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "basic",
    name: "Basic",
    description: "Start building characters",
    price: 12,
    period: "month",
    tokens: 500,
    tokenNote: "monthly",
    highlight: false,
    cta: "Subscribe",
    features: [
      { text: "Everything in Free", included: true },
      { text: "500 tokens/month", included: true },
      { text: "Create up to 3 characters", included: true },
      { text: "Basic DNA editing (15 traits)", included: true },
      { text: "Version history (5 versions)", included: true },
      { text: "Basic simulations", included: false },
      { text: "Fine-tuning", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Full creative control",
    price: 39,
    period: "month",
    tokens: 2500,
    tokenNote: "monthly",
    highlight: true,
    cta: "Subscribe",
    badge: "Most Popular",
    features: [
      { text: "Everything in Basic", included: true },
      { text: "2,500 tokens/month", included: true },
      { text: "Create up to 15 characters", included: true },
      { text: "Full DNA editing (25+ traits)", included: true },
      { text: "Unlimited version history", included: true },
      { text: "Advanced simulations", included: true },
      { text: "Character fine-tuning", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Scale without limits",
    price: 199,
    period: "month",
    tokens: 15000,
    tokenNote: "monthly",
    highlight: false,
    cta: "Contact Sales",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "15,000 tokens/month", included: true },
      { text: "Unlimited characters", included: true },
      { text: "Custom trait definitions", included: true },
      { text: "Priority support", included: true },
      { text: "Bulk operations", included: true },
      { text: "Advanced fine-tuning", included: true },
      { text: "Full API access", included: true },
    ],
  },
];

const tokenPacks = [
  { tokens: 100, price: 5, perToken: 0.05, popular: false },
  { tokens: 500, price: 20, perToken: 0.04, popular: true, savings: "20%" },
  { tokens: 1500, price: 45, perToken: 0.03, popular: false, savings: "40%" },
  { tokens: 5000, price: 125, perToken: 0.025, popular: false, savings: "50%" },
];

const tokenUsage = [
  { action: "Chat message", cost: 1, icon: MessageSquare },
  { action: "Create character", cost: 50, icon: Dna },
  { action: "Edit DNA trait", cost: 5, icon: Brain },
  { action: "Basic simulation", cost: 20, icon: FlaskConical },
  { action: "Advanced simulation", cost: 50, icon: FlaskConical },
  { action: "Fine-tuning", cost: 200, icon: Cpu },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const annualDiscount = 0.2;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.75_0.18_280_/_0.1),transparent_50%)]" />
      
      <nav className="relative z-10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Dna className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">CharacterDNA</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="gradient-primary border-0">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Start free. Upgrade when you&apos;re ready to create. 
              Pay only for what you use.
            </p>

            <div className="inline-flex items-center gap-2 p-1.5 rounded-xl glass">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === "annual"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                  Save 20%
                </span>
              </button>
            </div>
          </motion.div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => {
              const displayPrice = billingPeriod === "annual" && plan.price > 0
                ? Math.round(plan.price * (1 - annualDiscount))
                : plan.price;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative rounded-2xl p-6 ${
                    plan.highlight
                      ? "glass border-2 border-primary/50 glow-primary"
                      : "glass"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium gradient-primary text-white">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      {plan.id === "free" && <Sparkles className="w-5 h-5 text-muted-foreground" />}
                      {plan.id === "basic" && <Zap className="w-5 h-5 text-primary" />}
                      {plan.id === "pro" && <Crown className="w-5 h-5 text-accent" />}
                      {plan.id === "enterprise" && <Building2 className="w-5 h-5 text-chart-3" />}
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${displayPrice}</span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground">/{plan.period}</span>
                      )}
                    </div>
                    {billingPeriod === "annual" && plan.price > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed ${displayPrice * 12}/year
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/50 mb-6">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{plan.tokens.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">tokens {plan.tokenNote}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground/50"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.id === "enterprise" ? "/contact" : "/auth/signup"}>
                    <Button
                      className={`w-full ${
                        plan.highlight ? "gradient-primary border-0" : ""
                      }`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                      {plan.id !== "enterprise" && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border/50 py-24">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Need More Tokens?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Run out before your monthly reset? Purchase additional token packs anytime. 
                Bigger packs mean better value.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tokenPacks.map((pack, i) => (
                <motion.div
                  key={pack.tokens}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative glass rounded-xl p-5 ${
                    pack.popular ? "border-primary/50 ring-1 ring-primary/20" : ""
                  }`}
                >
                  {pack.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                        Best Value
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-1">
                      {pack.tokens.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">tokens</div>
                    
                    <div className="text-2xl font-semibold mb-1">${pack.price}</div>
                    <div className="text-xs text-muted-foreground mb-4">
                      ${pack.perToken.toFixed(3)}/token
                      {pack.savings && (
                        <span className="ml-2 text-accent">Save {pack.savings}</span>
                      )}
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      Purchase
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/50 py-24 bg-secondary/20">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Token Usage Guide</h2>
              <p className="text-muted-foreground">
                Know exactly what each action costs. No surprises.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokenUsage.map((item, i) => (
                <motion.div
                  key={item.action}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 glass rounded-xl p-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.action}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{item.cost}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 p-6 rounded-xl glass text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Infinity className="w-5 h-5 text-accent" />
                <span className="font-semibold">Tokens Never Expire</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Purchased tokens roll over month to month. Subscription tokens reset monthly.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="border-t border-border/50 py-24">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            </motion.div>

            <div className="space-y-4">
              {[
                {
                  q: "Can I try before I subscribe?",
                  a: "Absolutely! Free users get 50 tokens to chat with demo characters and explore how Character DNA works. No credit card required.",
                },
                {
                  q: "What happens if I run out of tokens?",
                  a: "You can purchase additional token packs anytime, or wait for your monthly subscription tokens to reset. Your characters and data are never affected.",
                },
                {
                  q: "Can I downgrade my plan?",
                  a: "Yes, you can downgrade at any time. Your characters remain, but you'll lose access to features beyond your new plan's limits until you upgrade again.",
                },
                {
                  q: "What's the difference between Basic and Pro DNA editing?",
                  a: "Basic includes 15 core personality traits. Pro unlocks all 25+ traits across emotional, cognitive, social, and behavioral categories, plus influence weights.",
                },
                {
                  q: "How does fine-tuning work?",
                  a: "Fine-tuning lets you train your character on specific conversation styles or knowledge. It uses 200 tokens and creates a specialized version of your character.",
                },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl p-6"
                >
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/50 py-24">
          <div className="max-w-3xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-12 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">Start Free Today</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                  Get 50 free tokens and explore demo characters. 
                  No credit card required. Upgrade anytime.
                </p>
                <Link href="/auth/signup">
                  <Button size="lg" className="gradient-primary border-0 h-12 px-8 glow-primary">
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
