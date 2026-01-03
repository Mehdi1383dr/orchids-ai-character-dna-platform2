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

const batchUpdateSchema = z.object({
  updates: z.array(z.object({
    traitId: z.string().uuid(),
    traitValue: z.number().min(0).max(100),
  })),
  reason: z.string().max(200).optional(),
});

const rollbackSchema = z.object({
  targetVersion: z.number().int().positive(),
  reason: z.string().min(1).max(200),
});

const addRuleSchema = z.object({
  sourceTraitId: z.string().uuid(),
  targetTraitId: z.string().uuid(),
  ruleType: z.enum(["dependency", "conflict", "correlation", "inverse_correlation"]),
  strength: z.number().min(0).max(1).optional(),
  description: z.string().max(500).optional(),
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
    const includeRules = searchParams.get("includeRules") === "true";
    const includeVersions = searchParams.get("includeVersions") === "true";

    const dnaService = new DNAService();

    const [traitsResult, rulesResult, versionsResult] = await Promise.all([
      dnaService.getTraits(characterId),
      includeRules ? dnaService.getRules(characterId) : Promise.resolve({ success: true, data: [] }),
      includeVersions ? dnaService.getVersionHistory(characterId) : Promise.resolve({ success: true, data: [] }),
    ]);

    if (!traitsResult.success) {
      return NextResponse.json({ error: traitsResult.error }, { status: 500 });
    }

    return NextResponse.json({
      traits: traitsResult.data,
      rules: rulesResult.data,
      versions: versionsResult.data,
    });
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

    const { id: characterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const body = await request.json();

    const dnaService = new DNAService();

    if (action === "batch") {
      const input = batchUpdateSchema.parse(body);
      const result = await dnaService.updateTraitsBatch(characterId, user.id, input.updates, input.reason);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          FORBIDDEN: 403,
          LOCKED: 423,
          INSUFFICIENT_TOKENS: 402,
        };
        const status = statusMap[result.code || ""] || 500;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }

      return NextResponse.json({ traits: result.data });
    }

    if (action === "rollback") {
      const input = rollbackSchema.parse(body);
      const result = await dnaService.rollback(characterId, user.id, input);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          FORBIDDEN: 403,
          INSUFFICIENT_TOKENS: 402,
        };
        const status = statusMap[result.code || ""] || 500;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }

      return NextResponse.json({ traits: result.data });
    }

    if (action === "reset") {
      const { reason } = z.object({ reason: z.string().min(1).max(200) }).parse(body);
      const result = await dnaService.reset(characterId, user.id, reason);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          FORBIDDEN: 403,
          INSUFFICIENT_TOKENS: 402,
        };
        const status = statusMap[result.code || ""] || 500;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }

      return NextResponse.json({ traits: result.data });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
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

    const { id: characterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const body = await request.json();

    const dnaService = new DNAService();

    if (action === "add-rule") {
      const input = addRuleSchema.parse(body);
      const result = await dnaService.addRule(characterId, user.id, input);

      if (!result.success) {
        const status = result.code === "NOT_FOUND" ? 404 : result.code === "FORBIDDEN" ? 403 : 500;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }

      return NextResponse.json({ rule: result.data }, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
