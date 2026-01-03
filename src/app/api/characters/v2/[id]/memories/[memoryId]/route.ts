import { NextRequest, NextResponse } from "next/server";
import { MemoryService } from "@/lib/services/memory-service";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { z } from "zod";

const updateMemorySchema = z.object({
  importance: z.enum(["low", "medium", "high", "critical"]).optional(),
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
});

interface RouteParams {
  params: Promise<{ id: string; memoryId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { memoryId } = await params;

    const memoryService = new MemoryService();
    const result = await memoryService.getMemory(memoryId);

    if (!result.success) {
      const status = result.code === "NOT_FOUND" ? 404 : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ memory: result.data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { memoryId } = await params;
    const body = await request.json();
    const input = updateMemorySchema.parse(body);

    const memoryService = new MemoryService();
    const result = await memoryService.updateMemory(memoryId, user.id, input);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        IMMUTABLE: 423,
      };
      const status = statusMap[result.code || ""] || 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ memory: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { memoryId } = await params;

    const memoryService = new MemoryService();
    const result = await memoryService.deleteMemory(memoryId, user.id);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        IMMUTABLE: 423,
      };
      const status = statusMap[result.code || ""] || 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ success: true });
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

    const { memoryId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const memoryService = new MemoryService();

    if (action === "promote") {
      const body = await request.json();
      const { targetType } = z.object({
        targetType: z.enum(["long_term", "core"]),
      }).parse(body);

      const result = await memoryService.promoteMemory(memoryId, user.id, targetType);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          FORBIDDEN: 403,
          INVALID_PROMOTION: 400,
          INSUFFICIENT_TOKENS: 402,
        };
        const status = statusMap[result.code || ""] || 500;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }

      return NextResponse.json({ memory: result.data });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
