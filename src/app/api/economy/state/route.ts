import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cognitiveEconomyEngine } from "@/lib/services/cognitive-economy-engine";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cognitiveEconomyEngine.getUserEconomicState(user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const state = result.data!;

  const tokenBalances: Record<string, unknown> = {};
  for (const [tokenClass, balance] of state.tokenBalances) {
    tokenBalances[tokenClass] = {
      available: balance.available,
      locked: balance.locked,
      staked: balance.staked,
      pendingDecay: balance.pendingDecay,
      amplifiedBonus: balance.amplifiedBonus,
    };
  }

  const subscriptionTiers = cognitiveEconomyEngine.getSubscriptionTiers();
  const currentTierInfo = subscriptionTiers[state.subscriptionTier];

  return NextResponse.json({
    userId: state.userId,
    subscription: {
      tier: state.subscriptionTier,
      status: state.subscriptionStatus,
      displayName: currentTierInfo.displayName,
      capabilities: currentTierInfo.capabilityLimits,
      features: currentTierInfo.features,
    },
    tokenBalances,
    activeAmplifiers: state.activeAmplifiers,
    economicAdjustments: state.economicAdjustments,
    usageStreak: state.usageStreak,
    lastInteractionAt: state.lastInteractionAt,
    memberSince: state.createdAt,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cognitiveEconomyEngine.initializeUserEconomy(user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ initialized: true });
}
