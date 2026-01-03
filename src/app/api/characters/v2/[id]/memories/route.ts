import { NextRequest, NextResponse } from "next/server";
import { MemoryService } from "@/lib/services/memory-service";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SubscriptionPlan } from "@/lib/types/character";

const createMemorySchema = z.object({
  memoryType: z.enum(["short_term", "long_term", "core"]),
  importance: z.enum(["low", "medium", "high", "critical"]).optional(),
  content: z.string().min(1).max(10000),
  contextData: z.object({
    conversationId: z.string().optional(),
    messageId: z.string().optional(),
    topic: z.string().optional(),
    participants: z.array(z.string()).optional(),
    location: z.string().optional(),
    timestamp: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).passthrough().optional(),
  emotionalImpact: z.object({
    valence: z.number().min(-1).max(1).optional(),
    arousal: z.number().min(0).max(1).optional(),
    dominance: z.number().min(0).max(1).optional(),
    primaryEmotion: z.string().optional(),
    secondaryEmotions: z.array(z.string()).optional(),
    intensity: z.number().min(0).max(1).optional(),
  }).passthrough().optional(),
  affectedTraits: z.array(z.object({
    traitKey: z.string(),
    impactStrength: z.number().min(0).max(10),
    direction: z.enum(["increase", "decrease", "reinforce"]),
  })).optional(),
  isImmutable: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  sourceType: z.string().optional(),
  sourceReferenceId: z.string().uuid().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { id: characterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as "short_term" | "long_term" | "core" | null;
    const importance = searchParams.get("importance") as "low" | "medium" | "high" | "critical" | null;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const includeExpired = searchParams.get("includeExpired") === "true";

    const memoryService = new MemoryService();
    const result = await memoryService.getMemories(characterId, {
      type: type || undefined,
      importance: importance || undefined,
      limit,
      includeExpired,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ memories: result.data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { id: characterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const body = await request.json();

    const memoryService = new MemoryService();

    if (action === "search") {
      const { query, type, limit } = z.object({
        query: z.string().min(1),
        type: z.enum(["short_term", "long_term", "core"]).optional(),
        limit: z.number().int().positive().optional(),
      }).parse(body);

      const result = await memoryService.searchMemories(characterId, query, { type, limit });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ memories: result.data });
    }

    if (action === "relevant") {
      const { topic, emotionalState, traitKeys, limit } = z.object({
        topic: z.string().optional(),
        emotionalState: z.string().optional(),
        traitKeys: z.array(z.string()).optional(),
        limit: z.number().int().positive().optional(),
      }).parse(body);

      const result = await memoryService.getRelevantMemories(
        characterId,
        { topic, emotionalState, traitKeys },
        limit
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ memories: result.data });
    }

    if (action === "summarize") {
      const { type } = z.object({
        type: z.enum(["short_term", "long_term", "core"]),
      }).parse(body);

      const result = await memoryService.summarizeMemories(characterId, type);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json(result.data);
    }

    const input = createMemorySchema.parse(body);

    const supabase = await createServiceClient();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const plan = (subscription?.plan || "free") as SubscriptionPlan;

    const result = await memoryService.createMemory(characterId, input, user.id, plan);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        LIMIT_REACHED: 403,
        INSUFFICIENT_TOKENS: 402,
        DUPLICATE: 409,
      };
      const status = statusMap[result.code || ""] || 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ memory: result.data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
