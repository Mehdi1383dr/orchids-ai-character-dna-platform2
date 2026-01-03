import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPassword, checkRateLimit } from "@/lib/services/otp-service";
import { createAuthSession } from "@/lib/services/session-service";
import { AUTH_CONFIG, AUTH_ERRORS, type AuthUser } from "@/lib/types/auth";

const loginPasswordSchema = z.object({
  identifier: z.string().min(1),
  identifierType: z.enum(["email", "phone"]),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = loginPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { identifier, identifierType, password } = validated.data;
    const supabase = await createServiceClient();

    const rateLimit = await checkRateLimit(identifier, "login");
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: AUTH_ERRORS.RATE_LIMITED,
        retryAfter: rateLimit.resetAt.toISOString(),
      }, { status: 429 });
    }

    const column = identifierType === "email" ? "email" : "phone";
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq(column, identifier)
      .single();

    if (!profile) {
      return NextResponse.json({ error: AUTH_ERRORS.INVALID_CREDENTIALS }, { status: 401 });
    }

    if (profile.account_status === "suspended") {
      return NextResponse.json({ error: AUTH_ERRORS.ACCOUNT_SUSPENDED }, { status: 403 });
    }

    if (profile.account_status === "deleted") {
      return NextResponse.json({ error: AUTH_ERRORS.INVALID_CREDENTIALS }, { status: 401 });
    }

    if (profile.account_status === "pending_verification") {
      return NextResponse.json({ error: AUTH_ERRORS.ACCOUNT_NOT_VERIFIED }, { status: 403 });
    }

    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      return NextResponse.json({ 
        error: AUTH_ERRORS.ACCOUNT_LOCKED,
        lockedUntil: profile.locked_until,
      }, { status: 403 });
    }

    if (!profile.password_hash) {
      return NextResponse.json({ error: AUTH_ERRORS.INVALID_CREDENTIALS }, { status: 401 });
    }

    const passwordValid = await verifyPassword(password, profile.password_hash);

    if (!passwordValid) {
      const newFailedAttempts = (profile.failed_login_attempts || 0) + 1;
      
      if (newFailedAttempts >= AUTH_CONFIG.lockout.maxFailedAttempts) {
        const lockedUntil = new Date(Date.now() + AUTH_CONFIG.lockout.lockoutMinutes * 60 * 1000);
        await supabase
          .from("profiles")
          .update({ 
            failed_login_attempts: newFailedAttempts,
            locked_until: lockedUntil.toISOString(),
          })
          .eq("id", profile.id);
        
        return NextResponse.json({ 
          error: AUTH_ERRORS.ACCOUNT_LOCKED,
          lockedUntil: lockedUntil.toISOString(),
        }, { status: 403 });
      }

      await supabase
        .from("profiles")
        .update({ failed_login_attempts: newFailedAttempts })
        .eq("id", profile.id);

      return NextResponse.json({ 
        error: AUTH_ERRORS.INVALID_CREDENTIALS,
        attemptsRemaining: AUTH_CONFIG.lockout.maxFailedAttempts - newFailedAttempts,
      }, { status: 401 });
    }

    await supabase
      .from("profiles")
      .update({ 
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    const user: AuthUser = {
      id: profile.id,
      username: profile.username || profile.email?.split("@")[0] || "user",
      email: profile.email,
      phone: profile.phone,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      accountStatus: profile.account_status,
      emailVerified: profile.email_verified || false,
      phoneVerified: profile.phone_verified || false,
      createdAt: profile.created_at,
      lastLoginAt: new Date().toISOString(),
    };

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const session = await createAuthSession(user, {}, ipAddress || undefined);

    return NextResponse.json({
      message: "Login successful",
      session,
    });
  } catch (error) {
    console.error("Login password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
