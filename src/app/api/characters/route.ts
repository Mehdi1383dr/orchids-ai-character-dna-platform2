import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DEFAULT_DNA_TRAITS, TOKEN_COSTS, SUBSCRIPTION_PLANS } from "@/lib/types/character-dna";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

const createCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  traits: z.object({
    core: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })),
    emotional: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })),
    cognitive: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })),
    social: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })),
    behavioral: z.array(z.object({
      key: z.string(),
      value: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).default(1.0),
    })),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return unauthorized();
    }

    const serviceClient = await createServiceClient();
    
    const { data: characters, error } = await serviceClient
      .from("character_dna")
      .select(`
        *,
        dna_traits (*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedCharacters = characters.map(char => ({
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const { name, avatarUrl, traits } = createCharacterSchema.parse(body);

    const serviceClient = await createServiceClient();

    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const plan = subscription?.plan || "free";
    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];

    if (!planConfig.canCreate) {
      return NextResponse.json({ 
        error: "Subscription required to create characters" 
      }, { status: 403 });
    }

    const { count: characterCount } = await serviceClient
      .from("character_dna")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_demo", false);

    if (planConfig.maxCharacters !== -1 && (characterCount || 0) >= planConfig.maxCharacters) {
      return NextResponse.json({ 
        error: `Character limit reached for ${plan} plan` 
      }, { status: 403 });
    }

    const { data: tokenBalance } = await serviceClient
      .from("token_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!tokenBalance || tokenBalance.balance < TOKEN_COSTS.character_creation) {
      return NextResponse.json({ 
        error: "Insufficient tokens" 
      }, { status: 402 });
    }

    const { data: character, error: charError } = await serviceClient
      .from("character_dna")
      .insert({
        user_id: user.id,
        name,
        avatar_url: avatarUrl,
        version: 1,
      })
      .select()
      .single();

    if (charError) {
      return NextResponse.json({ error: charError.message }, { status: 500 });
    }

    const dnaTraits = traits || DEFAULT_DNA_TRAITS;
    const traitInserts: Array<{
      character_id: string;
      category: string;
      trait_key: string;
      trait_value: number;
      influence_weight: number;
    }> = [];

    for (const [category, categoryTraits] of Object.entries(dnaTraits)) {
      for (const trait of categoryTraits) {
        traitInserts.push({
          character_id: character.id,
          category,
          trait_key: trait.key,
          trait_value: trait.value,
          influence_weight: trait.influenceWeight,
        });
      }
    }

    await serviceClient.from("dna_traits").insert(traitInserts);

    await serviceClient.from("dna_versions").insert({
      character_id: character.id,
      version: 1,
      traits_snapshot: dnaTraits,
      change_reason: "Initial creation",
    });

    await serviceClient
      .from("token_balances")
      .update({
        balance: tokenBalance.balance - TOKEN_COSTS.character_creation,
        lifetime_spent: tokenBalance.balance + TOKEN_COSTS.character_creation,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    await serviceClient.from("token_ledger").insert({
      user_id: user.id,
      amount: -TOKEN_COSTS.character_creation,
      balance_after: tokenBalance.balance - TOKEN_COSTS.character_creation,
      action: "create_character",
      description: `Created character: ${name}`,
      reference_type: "character",
      reference_id: character.id,
    });

    return NextResponse.json({ 
      character: {
        ...character,
        traits: dnaTraits,
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
