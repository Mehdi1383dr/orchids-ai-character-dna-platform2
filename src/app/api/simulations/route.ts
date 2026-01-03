import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { TOKEN_COSTS } from "@/lib/types/character-dna";

const createSimulationSchema = z.object({
  characterId: z.string().uuid(),
  scenarioType: z.enum(["conversation", "conflict", "decision", "stress", "social"]),
  scenarioConfig: z.object({
    context: z.string(),
    participants: z.array(z.string()).optional(),
    duration: z.number().optional(),
    complexity: z.enum(["basic", "advanced"]).default("basic"),
  }),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    
    const { data: simulations, error } = await serviceClient
      .from("simulations")
      .select(`
        *,
        character_dna (id, name, avatar_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ simulations });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { characterId, scenarioType, scenarioConfig } = createSimulationSchema.parse(body);

    const serviceClient = await createServiceClient();

    const { data: character } = await serviceClient
      .from("character_dna")
      .select("id, user_id, is_demo")
      .eq("id", characterId)
      .single();

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    if (character.user_id !== user.id && !character.is_demo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tokenCost = scenarioConfig.complexity === "advanced" 
      ? TOKEN_COSTS.simulation_advanced 
      : TOKEN_COSTS.simulation_basic;

    const { data: tokenBalance } = await serviceClient
      .from("token_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!tokenBalance || tokenBalance.balance < tokenCost) {
      return NextResponse.json({ error: "Insufficient tokens" }, { status: 402 });
    }

    const { data: simulation, error: simError } = await serviceClient
      .from("simulations")
      .insert({
        user_id: user.id,
        character_id: characterId,
        scenario_type: scenarioType,
        scenario_config: scenarioConfig,
        status: "pending",
        tokens_spent: tokenCost,
      })
      .select()
      .single();

    if (simError) {
      return NextResponse.json({ error: simError.message }, { status: 500 });
    }

    await serviceClient
      .from("token_balances")
      .update({
        balance: tokenBalance.balance - tokenCost,
        lifetime_spent: tokenBalance.balance + tokenCost,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    await serviceClient.from("token_transactions").insert({
      user_id: user.id,
      amount: tokenCost,
      type: "debit",
      reason: "simulation",
      description: `Simulation: ${scenarioType}`,
      metadata: { simulation_id: simulation.id, character_id: characterId },
    });

    return NextResponse.json({ simulation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
