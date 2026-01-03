import { NextRequest, NextResponse } from "next/server";
import { CharacterService } from "@/lib/services/character-service";
import { DNAService } from "@/lib/services/dna-service";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SubscriptionPlan } from "@/lib/types/character";

const updateCharacterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  publicDescription: z.string().max(1000).optional(),
  creatorNotes: z.string().max(2000).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  visibility: z.enum(["private", "shared", "public"]).optional(),
  status: z.enum(["active", "archived", "locked"]).optional(),
});

const cloneCharacterSchema = z.object({
  newName: z.string().min(1).max(100),
  includeDNA: z.boolean().default(true),
  includeMemories: z.boolean().default(false),
  memoryTypes: z.array(z.enum(["short_term", "long_term", "core"])).optional(),
  includeVoiceProfile: z.boolean().default(false),
  includeVisualProfile: z.boolean().default(false),
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

    const { id } = await params;
    const full = request.nextUrl.searchParams.get("full") === "true";

    const characterService = new CharacterService();
    const result = full
      ? await characterService.getCharacterFull(id, user.id)
      : await characterService.getCharacter(id, user.id);

    if (!result.success) {
      const status = result.code === "NOT_FOUND" ? 404 : result.code === "FORBIDDEN" ? 403 : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ character: result.data });
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

    const { id } = await params;
    const body = await request.json();
    const input = updateCharacterSchema.parse(body);

    const characterService = new CharacterService();
    const result = await characterService.updateCharacter(id, user.id, input);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        LOCKED: 423,
      };
      const status = statusMap[result.code || ""] || 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ character: result.data });
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

    const { id } = await params;

    const characterService = new CharacterService();
    const result = await characterService.deleteCharacter(id, user.id);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
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

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "clone") {
      const body = await request.json();
      const input = cloneCharacterSchema.parse(body);

      const supabase = await createServiceClient();
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      const plan = (subscription?.plan || "free") as SubscriptionPlan;

      const characterService = new CharacterService();
      const result = await characterService.cloneCharacter(id, user.id, input, plan);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          FORBIDDEN: 403,
          INSUFFICIENT_TOKENS: 402,
        };
        const status = statusMap[result.code || ""] || 500;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }

      return NextResponse.json({ character: result.data }, { status: 201 });
    }

    if (action === "validate-dna") {
      const dnaService = new DNAService();
      const validation = await dnaService.validateDNA(id);
      return NextResponse.json(validation);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
