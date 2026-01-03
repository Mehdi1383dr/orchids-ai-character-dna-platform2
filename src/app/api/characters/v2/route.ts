import { NextRequest, NextResponse } from "next/server";
import { CharacterService } from "@/lib/services/character-service";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SubscriptionPlan } from "@/lib/types/character";

const createCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  publicDescription: z.string().max(1000).optional(),
  creatorNotes: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  visibility: z.enum(["private", "shared", "public"]).optional(),
  creationMode: z.enum(["standard", "advanced"]),
  initialDNA: z.object({
    core: z.array(z.object({
      category: z.literal("core"),
      traitKey: z.string(),
      traitValue: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).optional(),
      resistance: z.number().min(0).max(1).optional(),
      volatility: z.number().min(0).max(1).optional(),
    })).optional(),
    emotional: z.array(z.object({
      category: z.literal("emotional"),
      traitKey: z.string(),
      traitValue: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).optional(),
      resistance: z.number().min(0).max(1).optional(),
      volatility: z.number().min(0).max(1).optional(),
    })).optional(),
    cognitive: z.array(z.object({
      category: z.literal("cognitive"),
      traitKey: z.string(),
      traitValue: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).optional(),
      resistance: z.number().min(0).max(1).optional(),
      volatility: z.number().min(0).max(1).optional(),
    })).optional(),
    social: z.array(z.object({
      category: z.literal("social"),
      traitKey: z.string(),
      traitValue: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).optional(),
      resistance: z.number().min(0).max(1).optional(),
      volatility: z.number().min(0).max(1).optional(),
    })).optional(),
    behavioral: z.array(z.object({
      category: z.literal("behavioral"),
      traitKey: z.string(),
      traitValue: z.number().min(0).max(100),
      influenceWeight: z.number().min(0).max(2).optional(),
      resistance: z.number().min(0).max(1).optional(),
      volatility: z.number().min(0).max(1).optional(),
    })).optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const includeDemo = searchParams.get("includeDemo") === "true";
    const status = searchParams.get("status") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const characterService = new CharacterService();
    const result = await characterService.listCharacters(user.id, {
      includeDemo,
      status,
      limit,
      offset,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
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
    const input = createCharacterSchema.parse(body);

    const supabase = await createServiceClient();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const plan = (subscription?.plan || "free") as SubscriptionPlan;

    const characterService = new CharacterService();
    const result = await characterService.createCharacter(user.id, input, plan);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        LIMIT_REACHED: 403,
        INSUFFICIENT_TOKENS: 402,
        VALIDATION_ERROR: 400,
      };
      const status = statusMap[result.code || ""] || 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ character: result.data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
