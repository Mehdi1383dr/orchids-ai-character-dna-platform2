import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cognitiveEconomyEngine } from "@/lib/services/cognitive-economy-engine";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cognitiveEconomyEngine.getAllTokenBalances(user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const balances: Record<string, unknown> = {};
  for (const [tokenClass, balance] of result.data!) {
    balances[tokenClass] = {
      available: balance.available,
      locked: balance.locked,
      staked: balance.staked,
      pendingDecay: balance.pendingDecay,
      amplifiedBonus: balance.amplifiedBonus,
      total: balance.available + balance.locked + balance.staked + balance.amplifiedBonus,
    };
  }

  return NextResponse.json({ balances });
}
