import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { createOtpCode, sendOtp, verifyOtpCode, hashPassword } from "@/lib/services/otp-service";
import { AUTH_CONFIG, AUTH_ERRORS } from "@/lib/types/auth";

const requestResetSchema = z.object({
  identifier: z.string().min(1),
  identifierType: z.enum(["email", "phone"]),
});

const verifyResetSchema = z.object({
  identifier: z.string().min(1),
  identifierType: z.enum(["email", "phone"]),
  code: z.string().length(6).regex(/^\d+$/, "Code must be 6 digits"),
  newPassword: z.string().min(AUTH_CONFIG.password.minLength).max(AUTH_CONFIG.password.maxLength),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = requestResetSchema.safeParse(body);

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

    if (!profile || profile.account_status !== "active") {
      return NextResponse.json({ 
        message: "If an account exists, a reset code has been sent",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    }

    const otpResult = await createOtpCode(identifier, identifierType, "password_reset");

    if ("error" in otpResult) {
      return NextResponse.json({ error: otpResult.error }, { status: 429 });
    }

    await sendOtp(identifier, identifierType, otpResult.otp, "password_reset");

    return NextResponse.json({
      message: "Reset code sent",
      identifier: identifierType === "email" 
        ? `${identifier.slice(0, 3)}***@${identifier.split("@")[1]}`
        : `***${identifier.slice(-4)}`,
      expiresAt: otpResult.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validated = verifyResetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { identifier, identifierType, code, newPassword } = validated.data;
    const supabase = await createServiceClient();

    const otpResult = await verifyOtpCode(identifier, code, "password_reset");

    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 });
    }

    const column = identifierType === "email" ? "email" : "phone";
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq(column, identifier)
      .single();

    if (!profile) {
      return NextResponse.json({ error: AUTH_ERRORS.INVALID_CREDENTIALS }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);

    await supabase
      .from("profiles")
      .update({ 
        password_hash: passwordHash,
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", profile.id);

    await supabase
      .from("auth_sessions")
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq("user_id", profile.id)
      .eq("revoked", false);

    return NextResponse.json({
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Password reset verify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
