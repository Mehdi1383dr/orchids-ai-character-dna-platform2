import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyOtpCode } from "@/lib/services/otp-service";
import { createAuthSession } from "@/lib/services/session-service";
import { AUTH_ERRORS, type AuthUser } from "@/lib/types/auth";

const verifySchema = z.object({
  identifier: z.string().min(1),
  identifierType: z.enum(["email", "phone"]),
  code: z.string().length(6),
  idempotencyKey: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = verifySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { identifier, identifierType, code, idempotencyKey } = validated.data;

    const supabase = await createServiceClient();

    const { data: pendingSignup } = await supabase
      .from("pending_signups")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (!pendingSignup) {
      return NextResponse.json({ error: AUTH_ERRORS.PENDING_SIGNUP_NOT_FOUND }, { status: 400 });
    }

    if (new Date(pendingSignup.expires_at) < new Date()) {
      await supabase.from("pending_signups").delete().eq("id", pendingSignup.id);
      return NextResponse.json({ error: AUTH_ERRORS.PENDING_SIGNUP_NOT_FOUND }, { status: 400 });
    }

    const otpResult = await verifyOtpCode(identifier, code, "signup_verification");
    
    if (!otpResult.valid) {
      await supabase
        .from("pending_signups")
        .update({ attempts: pendingSignup.attempts + 1 })
        .eq("id", pendingSignup.id);

      if (pendingSignup.attempts + 1 >= pendingSignup.max_attempts) {
        await supabase.from("pending_signups").delete().eq("id", pendingSignup.id);
      }

      return NextResponse.json({ error: otpResult.error }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: pendingSignup.email || undefined,
      phone: pendingSignup.phone || undefined,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        username: pendingSignup.username,
      },
    });

    if (authError || !authData.user) {
      console.error("Failed to create auth user:", authError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      username: pendingSignup.username,
      email: pendingSignup.email,
      phone: pendingSignup.phone,
      password_hash: pendingSignup.password_hash,
      account_status: "active",
      email_verified: identifierType === "email",
      phone_verified: identifierType === "phone",
    });

    if (profileError) {
      console.error("Failed to create profile:", profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const { error: tokenError } = await supabase.from("token_balances").insert({
      user_id: authData.user.id,
      balance: 100,
      free_daily_tokens: 10,
      lifetime_earned: 100,
    });

    if (tokenError) {
      console.error("Failed to create token balance:", tokenError);
    }

    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: authData.user.id,
      plan: "free",
      status: "active",
    });

    if (subError) {
      console.error("Failed to create subscription:", subError);
    }

    await supabase.from("pending_signups").delete().eq("id", pendingSignup.id);

    const user: AuthUser = {
      id: authData.user.id,
      username: pendingSignup.username,
      email: pendingSignup.email,
      phone: pendingSignup.phone,
      displayName: null,
      avatarUrl: null,
      accountStatus: "active",
      emailVerified: identifierType === "email",
      phoneVerified: identifierType === "phone",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const session = await createAuthSession(user, { userAgent }, clientIp);

    return NextResponse.json({
      session,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Signup verify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
