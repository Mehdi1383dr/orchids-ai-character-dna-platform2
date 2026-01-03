import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cognitiveEconomyEngine } from "@/lib/services/cognitive-economy-engine";
import type { TokenClass, TokenContextType } from "@/lib/types/cognitive-economy";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { tokenClass, amount, contextType, contextId, pricingFactors } = body;

  if (!tokenClass || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "Invalid request. tokenClass and positive amount required" },
      { status: 400 }
    );
  }

  const result = await cognitiveEconomyEngine.consumeTokens(
    user.id,
    tokenClass as TokenClass,
    amount,
    contextType as TokenContextType || "interaction",
    contextId || null,
    pricingFactors || null
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    consumed: result.data!.consumed,
    remaining: result.data!.remaining,
  });
}
