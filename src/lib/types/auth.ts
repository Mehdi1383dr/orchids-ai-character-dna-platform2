export type AccountStatus = "pending_verification" | "active" | "suspended" | "deleted";
export type OtpPurpose = "signup_verification" | "login" | "password_reset";
export type IdentifierType = "email" | "phone";

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface PendingSignup {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  createdAt: string;
}

export interface OtpCode {
  id: string;
  identifier: string;
  identifierType: IdentifierType;
  purpose: OtpPurpose;
  used: boolean;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  createdAt: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export const AUTH_CONFIG = {
  otp: {
    length: 6,
    expiryMinutes: 10,
    maxAttempts: 5,
  },
  rateLimit: {
    otpRequest: { max: 5, windowMinutes: 15 },
    otpVerify: { max: 10, windowMinutes: 15 },
    login: { max: 10, windowMinutes: 15 },
  },
  session: {
    accessTokenExpiryMinutes: 15,
    refreshTokenExpiryDays: 30,
  },
  password: {
    minLength: 8,
    maxLength: 128,
  },
  pendingSignup: {
    expiryMinutes: 30,
  },
  lockout: {
    maxFailedAttempts: 5,
    lockoutMinutes: 30,
  },
} as const;

export interface SignupInitiateRequest {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  idempotencyKey: string;
}

export interface SignupVerifyRequest {
  identifier: string;
  identifierType: IdentifierType;
  code: string;
  idempotencyKey: string;
}

export interface LoginPasswordRequest {
  identifier: string;
  identifierType: IdentifierType;
  password: string;
}

export interface LoginOtpRequestRequest {
  identifier: string;
  identifierType: IdentifierType;
}

export interface LoginOtpVerifyRequest {
  identifier: string;
  identifierType: IdentifierType;
  code: string;
}

export interface PasswordResetRequestRequest {
  identifier: string;
  identifierType: IdentifierType;
}

export interface PasswordResetVerifyRequest {
  identifier: string;
  identifierType: IdentifierType;
  code: string;
  newPassword: string;
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: { code: "INVALID_CREDENTIALS", message: "Invalid email/phone or password" },
  ACCOUNT_LOCKED: { code: "ACCOUNT_LOCKED", message: "Account temporarily locked due to too many failed attempts" },
  ACCOUNT_SUSPENDED: { code: "ACCOUNT_SUSPENDED", message: "Account has been suspended" },
  ACCOUNT_NOT_VERIFIED: { code: "ACCOUNT_NOT_VERIFIED", message: "Please verify your account first" },
  OTP_INVALID: { code: "OTP_INVALID", message: "Invalid or expired verification code" },
  OTP_EXPIRED: { code: "OTP_EXPIRED", message: "Verification code has expired" },
  OTP_MAX_ATTEMPTS: { code: "OTP_MAX_ATTEMPTS", message: "Too many incorrect attempts" },
  RATE_LIMITED: { code: "RATE_LIMITED", message: "Too many requests. Please try again later" },
  EMAIL_EXISTS: { code: "EMAIL_EXISTS", message: "This email is already registered" },
  PHONE_EXISTS: { code: "PHONE_EXISTS", message: "This phone number is already registered" },
  USERNAME_EXISTS: { code: "USERNAME_EXISTS", message: "This username is already taken" },
  INVALID_SESSION: { code: "INVALID_SESSION", message: "Session expired or invalid" },
  PENDING_SIGNUP_NOT_FOUND: { code: "PENDING_SIGNUP_NOT_FOUND", message: "Signup session not found or expired" },
} as const;
