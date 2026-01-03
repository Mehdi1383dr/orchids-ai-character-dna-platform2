import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cognitiveEconomyEngine } from "@/lib/services/cognitive-economy-engine";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get("characterId") || undefined;

  const result = await cognitiveEconomyEngine.getActiveAmplifiers(user.id, characterId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const availableAmplifiers = cognitiveEconomyEngine.getValueAmplifiers();

  return NextResponse.json({
    active: result.data,
    available: availableAmplifiers,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { amplifierId, characterId } = body;

  if (!amplifierId) {
    return NextResponse.json({ error: "amplifierId required" }, { status: 400 });
  }

  const result = await cognitiveEconomyEngine.activateAmplifier(
    user.id,
    amplifierId,
    characterId
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ amplifier: result.data });
}
