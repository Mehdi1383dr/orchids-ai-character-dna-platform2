import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { createOtpCode, sendOtp, hashPassword } from "@/lib/services/otp-service";
import { AUTH_CONFIG, AUTH_ERRORS } from "@/lib/types/auth";

const initiateSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(8).max(128),
  idempotencyKey: z.string().uuid(),
}).refine(data => data.email || data.phone, {
  message: "Email or phone is required",
});

function maskIdentifier(identifier: string, type: "email" | "phone"): string {
  if (type === "email") {
    const [local, domain] = identifier.split("@");
    const maskedLocal = local.length > 2 
      ? local[0] + "*".repeat(Math.min(local.length - 2, 5)) + local[local.length - 1]
      : local[0] + "*";
    return `${maskedLocal}@${domain}`;
  } else {
    return identifier.slice(0, 3) + "*".repeat(4) + identifier.slice(-2);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = initiateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { username, email, phone, password, idempotencyKey } = validated.data;
    const identifier = email || phone!;
    const identifierType = email ? "email" : "phone" as const;

    const supabase = await createServiceClient();

    const { data: existingUsername } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUsername) {
      return NextResponse.json({ error: AUTH_ERRORS.USERNAME_EXISTS }, { status: 400 });
    }

    if (email) {
      const { data: existingEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (existingEmail) {
        return NextResponse.json({ error: AUTH_ERRORS.EMAIL_EXISTS }, { status: 400 });
      }
    }

    if (phone) {
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .single();

      if (existingPhone) {
        return NextResponse.json({ error: AUTH_ERRORS.PHONE_EXISTS }, { status: 400 });
      }
    }

    const { data: existingPending } = await supabase
      .from("pending_signups")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existingPending) {
      const otpResult = await createOtpCode(identifier, identifierType, "signup_verification");
      
      if ("error" in otpResult) {
        return NextResponse.json({ error: otpResult.error }, { status: 429 });
      }

      await sendOtp(identifier, identifierType, otpResult.otp, "signup_verification");

      return NextResponse.json({
        identifier: maskIdentifier(identifier, identifierType),
        expiresAt: otpResult.expiresAt.toISOString(),
      });
    }

    const passwordHash = await hashPassword(password);
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.pendingSignup.expiryMinutes * 60 * 1000);

    const { error: insertError } = await supabase.from("pending_signups").insert({
      username,
      email: email || null,
      phone: phone || null,
      password_hash: passwordHash,
      idempotency_key: idempotencyKey,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("Failed to create pending signup:", insertError);
      return NextResponse.json({ error: "Failed to initiate signup" }, { status: 500 });
    }

    const otpResult = await createOtpCode(identifier, identifierType, "signup_verification");
    
    if ("error" in otpResult) {
      return NextResponse.json({ error: otpResult.error }, { status: 429 });
    }

    await sendOtp(identifier, identifierType, otpResult.otp, "signup_verification");

    return NextResponse.json({
      identifier: maskIdentifier(identifier, identifierType),
      expiresAt: otpResult.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Signup initiate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
