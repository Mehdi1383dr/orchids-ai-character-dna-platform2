import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminGrantTokens, adminRevokeTokens, getBalance } from "@/lib/services/ledger-service";

const grantSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
  expiresInDays: z.number().int().positive().optional(),
});

const revokeSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = await isAdmin(user.id);
    if (!adminCheck) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "grant") {
      const validated = grantSchema.parse(body);
      
      let expiresAt: Date | undefined;
      if (validated.expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + validated.expiresInDays);
      }

      const result = await adminGrantTokens(
        validated.userId,
        validated.amount,
        user.id,
        validated.reason,
        expiresAt
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        entry: result.entry,
        newBalance: result.newBalance,
      });
    }

    if (action === "revoke") {
      const validated = revokeSchema.parse(body);

      const result = await adminRevokeTokens(
        validated.userId,
        validated.amount,
        user.id,
        validated.reason
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        entry: result.entry,
        newBalance: result.newBalance,
      });
    }

    if (action === "balance") {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(body);
      const balance = await getBalance(userId);
      return NextResponse.json({ balance });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Admin tokens error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
