import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const serviceClient = await createServiceClient();
    
    const { data: demoCharacters, error } = await serviceClient
      .from("character_dna")
      .select(`
        *,
        dna_traits (*)
      `)
      .eq("is_demo", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedCharacters = demoCharacters.map(char => ({
      id: char.id,
      userId: char.user_id,
      name: char.name,
      avatarUrl: char.avatar_url,
      isDemo: char.is_demo,
      isPublic: char.is_public,
      version: char.version,
      traits: {
        core: char.dna_traits.filter((t: { category: string }) => t.category === "core").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
        emotional: char.dna_traits.filter((t: { category: string }) => t.category === "emotional").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
        cognitive: char.dna_traits.filter((t: { category: string }) => t.category === "cognitive").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
        social: char.dna_traits.filter((t: { category: string }) => t.category === "social").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
        behavioral: char.dna_traits.filter((t: { category: string }) => t.category === "behavioral").map((t: { trait_key: string; trait_value: number; influence_weight: number }) => ({
          key: t.trait_key,
          value: t.trait_value,
          influenceWeight: t.influence_weight,
        })),
      },
      createdAt: char.created_at,
      updatedAt: char.updated_at,
    }));

    return NextResponse.json({ characters: formattedCharacters });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
