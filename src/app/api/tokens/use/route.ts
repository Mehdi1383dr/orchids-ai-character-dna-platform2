import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkBalance, deductTokens } from "@/lib/services/ledger-service";
import { ACTION_COSTS, ACTION_LABELS, type LedgerActionType } from "@/lib/types/ledger";

const VALID_ACTIONS = [
  "chat", "create_character", "character_edit", 
  "dna_edit", "dna_edit_advanced", "simulation_basic", 
  "simulation_advanced", "fine_tune", "api_call"
] as const;

const checkSchema = z.object({
  action: z.enum(VALID_ACTIONS),
});

const deductSchema = z.object({
  action: z.enum(VALID_ACTIONS),
  referenceId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!action) {
      return NextResponse.json({
        costs: ACTION_COSTS,
        labels: ACTION_LABELS,
      });
    }

    const validated = checkSchema.safeParse({ action });
    if (!validated.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await checkBalance(user.id, validated.data.action as LedgerActionType);

    return NextResponse.json({
      action: validated.data.action,
      label: ACTION_LABELS[validated.data.action],
      ...result,
    });
  } catch (error) {
    console.error("Check balance error:", error);
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
    const validated = deductSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues }, { status: 400 });
    }

    const { action, referenceId, idempotencyKey, metadata } = validated.data;
    
    const result = await deductTokens(user.id, action as LedgerActionType, {
      referenceId,
      idempotencyKey,
      metadata,
    });

    if (!result.success) {
      const cost = ACTION_COSTS[action];
      return NextResponse.json({
        error: "Insufficient tokens",
        details: result.error,
        currentBalance: result.newBalance,
        cost,
        shortfall: cost - (result.newBalance || 0),
      }, { status: 402 });
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      entry: result.entry,
      idempotent: result.idempotent || false,
    });
  } catch (error) {
    console.error("Deduct tokens error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
