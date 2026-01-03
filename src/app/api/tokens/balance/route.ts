import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getBalance, grantFreeDaily } from "@/lib/services/ledger-service";
import { ACTION_COSTS, ACTION_LABELS } from "@/lib/types/ledger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await grantFreeDaily(user.id);

    const balance = await getBalance(user.id);

    return NextResponse.json({
      balance: {
        total: balance.currentBalance,
        subscription: balance.subscriptionTokens,
        purchased: balance.purchasedTokens,
        freeDaily: balance.freeTokens,
        admin: balance.adminTokens,
      },
      costs: ACTION_COSTS,
      labels: ACTION_LABELS,
    });
  } catch (error) {
    console.error("Balance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
