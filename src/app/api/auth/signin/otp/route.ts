import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { createOtpCode, sendOtp, verifyOtpCode } from "@/lib/services/otp-service";
import { createAuthSession } from "@/lib/services/session-service";
import { AUTH_ERRORS, type AuthUser } from "@/lib/types/auth";

const requestOtpSchema = z.object({
  identifier: z.string().min(1),
  identifierType: z.enum(["email", "phone"]),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(1),
  identifierType: z.enum(["email", "phone"]),
  code: z.string().length(6).regex(/^\d+$/, "Code must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = requestOtpSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { identifier, identifierType } = validated.data;
    const supabase = await createServiceClient();

    const column = identifierType === "email" ? "email" : "phone";
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, account_status")
      .eq(column, identifier)
      .single();

    if (!profile) {
      return NextResponse.json({ 
        message: "If an account exists, a verification code has been sent",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    }

    if (profile.account_status === "suspended") {
      return NextResponse.json({ error: AUTH_ERRORS.ACCOUNT_SUSPENDED }, { status: 403 });
    }

    if (profile.account_status === "deleted") {
      return NextResponse.json({ 
        message: "If an account exists, a verification code has been sent",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    }

    const otpResult = await createOtpCode(identifier, identifierType, "login");

    if ("error" in otpResult) {
      return NextResponse.json({ error: otpResult.error }, { status: 429 });
    }

    await sendOtp(identifier, identifierType, otpResult.otp, "login");

    return NextResponse.json({
      message: "Verification code sent",
      identifier: identifierType === "email" 
        ? `${identifier.slice(0, 3)}***@${identifier.split("@")[1]}`
        : `***${identifier.slice(-4)}`,
      expiresAt: otpResult.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Login OTP request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validated = verifyOtpSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { identifier, identifierType, code } = validated.data;
    const supabase = await createServiceClient();

    const otpResult = await verifyOtpCode(identifier, code, "login");

    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 });
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

    if (profile.account_status !== "active") {
      return NextResponse.json({ error: AUTH_ERRORS.ACCOUNT_SUSPENDED }, { status: 403 });
    }

    await supabase
      .from("profiles")
      .update({ 
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        [`${identifierType}_verified`]: true,
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
      emailVerified: profile.email_verified || identifierType === "email",
      phoneVerified: profile.phone_verified || identifierType === "phone",
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
    console.error("Login OTP verify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
