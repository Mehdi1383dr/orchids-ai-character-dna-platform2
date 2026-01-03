import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { TOKEN_COSTS } from "@/lib/types/character-dna";

const updateTraitsSchema = z.object({
  traits: z.object({
    core: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })).optional(),
    emotional: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })).optional(),
    cognitive: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })).optional(),
    social: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })).optional(),
    behavioral: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })).optional(),
  }),
  changeReason: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    
    const { data: character, error } = await serviceClient
      .from("character_dna")
      .select(`
        *,
        dna_traits (*)
      `)
      .eq("id", id)
      .single();

    if (error || !character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    if (character.user_id !== user.id && !character.is_demo && !character.is_public) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formattedCharacter = {
      id: character.id,
      userId: character.user_id,
      name: character.name,
      avatarUrl: character.avatar_url,
      isDemo: character.is_demo,
      isPublic: character.is_public,
      version: character.version,
      traits: {
        core: character.dna_traits.filter((t: { category: string }) => t.category === "core").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
        emotional: character.dna_traits.filter((t: { category: string }) => t.category === "emotional").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
        cognitive: character.dna_traits.filter((t: { category: string }) => t.category === "cognitive").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
        social: character.dna_traits.filter((t: { category: string }) => t.category === "social").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
        behavioral: character.dna_traits.filter((t: { category: string }) => t.category === "behavioral").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
      },
      createdAt: character.created_at,
      updatedAt: character.updated_at,
    };

    return NextResponse.json({ character: formattedCharacter });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { traits, changeReason } = updateTraitsSchema.parse(body);

    const serviceClient = await createServiceClient();

    const { data: character } = await serviceClient
      .from("character_dna")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const { data: tokenBalance } = await serviceClient
      .from("token_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!tokenBalance || tokenBalance.balance < TOKEN_COSTS.dna_edit) {
      return NextResponse.json({ error: "Insufficient tokens" }, { status: 402 });
    }

    for (const [category, categoryTraits] of Object.entries(traits)) {
      if (categoryTraits) {
        for (const trait of categoryTraits) {
          await serviceClient
            .from("dna_traits")
            .update({
              trait_value: trait.value,
              influence_weight: trait.influenceWeight,
              updated_at: new Date().toISOString(),
            })
            .eq("character_id", id)
            .eq("category", category)
            .eq("trait_key", trait.key);
        }
      }
    }

    const newVersion = character.version + 1;

    await serviceClient
      .from("character_dna")
      .update({
        version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    const { data: allTraits } = await serviceClient
      .from("dna_traits")
      .select("*")
      .eq("character_id", id);

    const traitsSnapshot = {
      core: allTraits?.filter(t => t.category === "core").map(t => ({
        key: t.trait_key,
        value: t.trait_value,
        influenceWeight: t.influence_weight,
      })) || [],
      emotional: allTraits?.filter(t => t.category === "emotional").map(t => ({
        key: t.trait_key,
        value: t.trait_value,
        influenceWeight: t.influence_weight,
      })) || [],
      cognitive: allTraits?.filter(t => t.category === "cognitive").map(t => ({
        key: t.trait_key,
        value: t.trait_value,
        influenceWeight: t.influence_weight,
      })) || [],
      social: allTraits?.filter(t => t.category === "social").map(t => ({
        key: t.trait_key,
        value: t.trait_value,
        influenceWeight: t.influence_weight,
      })) || [],
      behavioral: allTraits?.filter(t => t.category === "behavioral").map(t => ({
        key: t.trait_key,
        value: t.trait_value,
        influenceWeight: t.influence_weight,
      })) || [],
    };

    await serviceClient.from("dna_versions").insert({
      character_id: id,
      version: newVersion,
      traits_snapshot: traitsSnapshot,
      change_reason: changeReason || "DNA traits updated",
    });

    await serviceClient
      .from("token_balances")
      .update({
        balance: tokenBalance.balance - TOKEN_COSTS.dna_edit,
        lifetime_spent: tokenBalance.balance + TOKEN_COSTS.dna_edit,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    await serviceClient.from("token_transactions").insert({
      user_id: user.id,
      amount: TOKEN_COSTS.dna_edit,
      type: "debit",
      reason: "dna_edit",
      description: `Updated DNA for: ${character.name}`,
      metadata: { character_id: id, version: newVersion },
    });

    return NextResponse.json({ 
      success: true,
      version: newVersion,
      traits: traitsSnapshot,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = await createServiceClient();

    const { error } = await serviceClient
      .from("character_dna")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
