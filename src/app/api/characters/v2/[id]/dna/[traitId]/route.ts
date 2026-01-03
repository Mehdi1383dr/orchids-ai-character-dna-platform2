import { NextRequest, NextResponse } from "next/server";
import { DNAService } from "@/lib/services/dna-service";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { z } from "zod";

const updateTraitSchema = z.object({
  traitValue: z.number().min(0).max(100).optional(),
  influenceWeight: z.number().min(0).max(2).optional(),
  resistance: z.number().min(0).max(1).optional(),
  volatility: z.number().min(0).max(1).optional(),
  reason: z.string().max(200).optional(),
});

interface RouteParams {
  params: Promise<{ id: string; traitId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { traitId } = await params;

    const dnaService = new DNAService();
    const result = await dnaService.getTrait(traitId);

    if (!result.success) {
      const status = result.code === "NOT_FOUND" ? 404 : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ trait: result.data });
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

    const { traitId } = await params;
    const body = await request.json();
    const input = updateTraitSchema.parse(body);

    const dnaService = new DNAService();
    const result = await dnaService.updateTrait(traitId, user.id, {
      traitValue: input.traitValue,
      influenceWeight: input.influenceWeight,
      resistance: input.resistance,
      volatility: input.volatility,
    }, input.reason);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        LOCKED: 423,
        INSUFFICIENT_TOKENS: 402,
        VALIDATION_ERROR: 400,
      };
      const status = statusMap[result.code || ""] || 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ trait: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { traitId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const dnaService = new DNAService();

    if (action === "lock") {
      const result = await dnaService.lockTrait(traitId, user.id);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          FORBIDDEN: 403,
          ALREADY_LOCKED: 409,
          INSUFFICIENT_TOKENS: 402,
        };
        const status = statusMap[result.code || ""] || 500;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }

      return NextResponse.json({ trait: result.data });
    }

    if (action === "unlock") {
      const result = await dnaService.unlockTrait(traitId, user.id);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          FORBIDDEN: 403,
          NOT_LOCKED: 409,
          INSUFFICIENT_TOKENS: 402,
        };
        const status = statusMap[result.code || ""] || 500;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }

      return NextResponse.json({ trait: result.data });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
