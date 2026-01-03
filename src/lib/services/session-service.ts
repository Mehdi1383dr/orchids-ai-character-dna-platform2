import { SignJWT, jwtVerify } from "jose";
import { createServiceClient } from "@/lib/supabase/server";
import { 
  AUTH_CONFIG, 
  AUTH_ERRORS,
  type AuthUser,
  type AuthSession,
} from "@/lib/types/auth";
import { generateRefreshToken, hashRefreshToken } from "./otp-service";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || "your-secret-key-min-32-characters!!"
);

export async function createAccessToken(user: AuthUser): Promise<string> {
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.session.accessTokenExpiryMinutes * 60 * 1000);
  
  return new SignJWT({
    sub: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    accountStatus: user.accountStatus,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string): Promise<{ valid: true; payload: AuthUser } | { valid: false }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      valid: true,
      payload: {
        id: payload.sub as string,
        username: payload.username as string,
        email: payload.email as string | null,
        phone: payload.phone as string | null,
        displayName: null,
        avatarUrl: null,
        accountStatus: payload.accountStatus as AuthUser["accountStatus"],
        emailVerified: true,
        phoneVerified: true,
        createdAt: "",
        lastLoginAt: null,
      },
    };
  } catch {
    return { valid: false };
  }
}

export async function createSession(
  userId: string,
  deviceInfo?: Record<string, unknown>,
  ipAddress?: string
): Promise<{ refreshToken: string; sessionId: string }> {
  const supabase = await createServiceClient();
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.session.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("auth_sessions")
    .insert({
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      device_info: deviceInfo || {},
      ip_address: ipAddress,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  return {
    refreshToken,
    sessionId: data?.id || "",
  };
}

export async function refreshSession(
  refreshToken: string
): Promise<AuthSession | { error: typeof AUTH_ERRORS.INVALID_SESSION }> {
  const supabase = await createServiceClient();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const { data: session } = await supabase
    .from("auth_sessions")
    .select("*, profiles(*)")
    .eq("refresh_token_hash", refreshTokenHash)
    .eq("revoked", false)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) {
    if (session) {
      await supabase
        .from("auth_sessions")
        .update({ revoked: true, revoked_at: new Date().toISOString() })
        .eq("id", session.id);
    }
    return { error: AUTH_ERRORS.INVALID_SESSION };
  }

  const profile = session.profiles;
  if (!profile || profile.account_status !== "active") {
    return { error: AUTH_ERRORS.INVALID_SESSION };
  }

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
    lastLoginAt: profile.last_login_at,
  };

  const accessToken = await createAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.session.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);

  await supabase
    .from("auth_sessions")
    .update({
      refresh_token_hash: newRefreshTokenHash,
      expires_at: expiresAt.toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresAt: Date.now() + AUTH_CONFIG.session.accessTokenExpiryMinutes * 60 * 1000,
    user,
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  const supabase = await createServiceClient();
  await supabase
    .from("auth_sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  const supabase = await createServiceClient();
  let query = supabase
    .from("auth_sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("revoked", false);

  if (exceptSessionId) {
    query = query.neq("id", exceptSessionId);
  }

  await query;
}

export async function revokeSessionByRefreshToken(refreshToken: string): Promise<void> {
  const supabase = await createServiceClient();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  
  await supabase
    .from("auth_sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("refresh_token_hash", refreshTokenHash);
}

export async function getUserSessions(userId: string): Promise<Array<{
  id: string;
  deviceInfo: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}>> {
  const supabase = await createServiceClient();
  
  const { data } = await supabase
    .from("auth_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .order("last_used_at", { ascending: false });

  return (data || []).map((s) => ({
    id: s.id,
    deviceInfo: s.device_info || {},
    ipAddress: s.ip_address,
    createdAt: s.created_at,
    lastUsedAt: s.last_used_at,
    isCurrent: false,
  }));
}

export async function createAuthSession(user: AuthUser, deviceInfo?: Record<string, unknown>, ipAddress?: string): Promise<AuthSession> {
  const accessToken = await createAccessToken(user);
  const { refreshToken } = await createSession(user.id, deviceInfo, ipAddress);

  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + AUTH_CONFIG.session.accessTokenExpiryMinutes * 60 * 1000,
    user,
  };
}
