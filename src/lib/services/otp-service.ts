import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { createServiceClient } from "@/lib/supabase/server";
import { 
  AUTH_CONFIG, 
  AUTH_ERRORS,
  type OtpPurpose, 
  type IdentifierType,
  type RateLimitResult 
} from "@/lib/types/auth";

const scryptAsync = promisify(scrypt);

export function generateOtp(): string {
  const digits = "0123456789";
  let otp = "";
  const randomValues = randomBytes(AUTH_CONFIG.otp.length);
  for (let i = 0; i < AUTH_CONFIG.otp.length; i++) {
    otp += digits[randomValues[i] % 10];
  }
  return otp;
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");
  return timingSafeEqual(derivedKey, keyBuffer);
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function checkRateLimit(
  identifier: string,
  action: "otpRequest" | "otpVerify" | "login"
): Promise<RateLimitResult> {
  const supabase = await createServiceClient();
  const config = AUTH_CONFIG.rateLimit[action];
  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

  const { data: existing } = await supabase
    .from("otp_rate_limits")
    .select("*")
    .eq("identifier", identifier)
    .eq("action", action)
    .single();

  if (!existing || new Date(existing.window_start) < windowStart) {
    await supabase
      .from("otp_rate_limits")
      .upsert({
        identifier,
        action,
        count: 1,
        window_start: new Date().toISOString(),
      }, { onConflict: "identifier,action" });

    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: new Date(Date.now() + config.windowMinutes * 60 * 1000),
    };
  }

  if (existing.count >= config.max) {
    const resetAt = new Date(new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  await supabase
    .from("otp_rate_limits")
    .update({ count: existing.count + 1 })
    .eq("id", existing.id);

  return {
    allowed: true,
    remaining: config.max - existing.count - 1,
    resetAt: new Date(new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000),
  };
}

export async function createOtpCode(
  identifier: string,
  identifierType: IdentifierType,
  purpose: OtpPurpose
): Promise<{ otp: string; expiresAt: Date } | { error: typeof AUTH_ERRORS.RATE_LIMITED }> {
  const supabase = await createServiceClient();

  const rateLimit = await checkRateLimit(identifier, "otpRequest");
  if (!rateLimit.allowed) {
    return { error: AUTH_ERRORS.RATE_LIMITED };
  }

  await supabase
    .from("otp_codes")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("identifier", identifier)
    .eq("purpose", purpose)
    .eq("used", false);

  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.otp.expiryMinutes * 60 * 1000);

  await supabase.from("otp_codes").insert({
    identifier,
    identifier_type: identifierType,
    code_hash: codeHash,
    purpose,
    expires_at: expiresAt.toISOString(),
    max_attempts: AUTH_CONFIG.otp.maxAttempts,
  });

  return { otp, expiresAt };
}

export async function verifyOtpCode(
  identifier: string,
  code: string,
  purpose: OtpPurpose
): Promise<{ valid: true } | { valid: false; error: typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS] }> {
  const supabase = await createServiceClient();

  const rateLimit = await checkRateLimit(identifier, "otpVerify");
  if (!rateLimit.allowed) {
    return { valid: false, error: AUTH_ERRORS.RATE_LIMITED };
  }

  const { data: otpRecord } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("identifier", identifier)
    .eq("purpose", purpose)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otpRecord) {
    return { valid: false, error: AUTH_ERRORS.OTP_INVALID };
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    await supabase
      .from("otp_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", otpRecord.id);
    return { valid: false, error: AUTH_ERRORS.OTP_EXPIRED };
  }

  if (otpRecord.attempts >= otpRecord.max_attempts) {
    await supabase
      .from("otp_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", otpRecord.id);
    return { valid: false, error: AUTH_ERRORS.OTP_MAX_ATTEMPTS };
  }

  const codeHash = hashOtp(code);
  if (codeHash !== otpRecord.code_hash) {
    await supabase
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);
    return { valid: false, error: AUTH_ERRORS.OTP_INVALID };
  }

  await supabase
    .from("otp_codes")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("id", otpRecord.id);

  return { valid: true };
}

export async function sendOtpEmail(email: string, otp: string, purpose: OtpPurpose): Promise<boolean> {
  const subjects: Record<OtpPurpose, string> = {
    signup_verification: "Verify your CharacterDNA account",
    login: "Your CharacterDNA login code",
    password_reset: "Reset your CharacterDNA password",
  };

  console.log(`[DEV] OTP for ${email} (${purpose}): ${otp}`);
  console.log(`Subject: ${subjects[purpose]}`);
  
  return true;
}

export async function sendOtpSms(phone: string, otp: string, purpose: OtpPurpose): Promise<boolean> {
  const messages: Record<OtpPurpose, string> = {
    signup_verification: `Your CharacterDNA verification code is: ${otp}`,
    login: `Your CharacterDNA login code is: ${otp}`,
    password_reset: `Your CharacterDNA password reset code is: ${otp}`,
  };

  console.log(`[DEV] OTP SMS to ${phone}: ${messages[purpose]}`);
  
  return true;
}

export async function sendOtp(
  identifier: string,
  identifierType: IdentifierType,
  otp: string,
  purpose: OtpPurpose
): Promise<boolean> {
  if (identifierType === "email") {
    return sendOtpEmail(identifier, otp, purpose);
  } else {
    return sendOtpSms(identifier, otp, purpose);
  }
}
