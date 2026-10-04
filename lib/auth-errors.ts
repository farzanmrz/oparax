import { authContent } from "@/lib/auth/content";

// Error mapping, converts raw Supabase error messages to user-friendly text. Prevents email enumeration.
const ERROR_MAP: Record<string, string> = {
  // Login errors
  "Invalid login credentials": authContent.invalidCredentials,
  "Email not confirmed": authContent.invalidCredentials,
  "Invalid Refresh Token: Refresh Token Not Found": authContent.expiredSession,

  // Signup errors
  "User already registered": authContent.signupFailed,
  "Password should be at least 6 characters": authContent.passwordLength,
  "Unable to validate email address: invalid format": authContent.emailInvalid,

  // Password reset errors
  "New password should be different from the old password.": authContent.differentPassword,
};

// Supabase rate-limit messages include a variable countdown
// ("...after 57 seconds", "...after 42 seconds") so exact match won't work.
const RATE_LIMIT_PATTERN = /you can only request this after \d+ seconds/i;
const RATE_LIMIT_MSG = authContent.rateLimited;

const DEFAULT_ERROR = authContent.genericError;

export function mapAuthError(rawMessage: string): string {
  if (RATE_LIMIT_PATTERN.test(rawMessage)) return RATE_LIMIT_MSG;
  return ERROR_MAP[rawMessage] ?? DEFAULT_ERROR;
}
