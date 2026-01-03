import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cognitiveEconomyEngine } from "@/lib/services/cognitive-economy-engine";
import type { TokenContextType, SimulationComplexityLevel } from "@/lib/types/cognitive-economy";
import type { IllusionRiskLevel } from "@/lib/types/ethical-guardrails";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    contextType,
    interactionDepth = 50,
    emotionalIntensity = 50,
    simulationComplexity = "none",
    stateComplexity = 50,
    systemLoad = 50,
    ethicalRiskLevel = "healthy",
  } = body;

  if (!contextType) {
    return NextResponse.json({ error: "contextType required" }, { status: 400 });
  }

  const result = await cognitiveEconomyEngine.calculateDynamicPrice(
    user.id,
    contextType as TokenContextType,
    {
      interactionDepth,
      emotionalIntensity,
      simulationComplexity: simulationComplexity as SimulationComplexityLevel,
      stateComplexity,
      systemLoad,
      ethicalRiskLevel: ethicalRiskLevel as IllusionRiskLevel,
    }
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ pricing: result.data });
}
