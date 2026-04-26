// Error mapping — converts raw Supabase error messages to user-friendly text. Prevents email enumeration.
const ERROR_MAP: Record<string, string> = {
  // Login errors
  "Invalid login credentials": "Invalid email or password.",
  "Email not confirmed": "Invalid email or password.",
  "Invalid Refresh Token: Refresh Token Not Found":
    "Your session has expired. Please sign in again.",

  // Signup errors
  "User already registered":
    "Unable to create account. Please try again or sign in.",
  "Password should be at least 6 characters":
    "Password must be at least 6 characters.",
  "Unable to validate email address: invalid format":
    "Please enter a valid email address.",
};

// Supabase rate-limit messages include a variable countdown
// ("...after 57 seconds", "...after 42 seconds") so exact match won't work.
const RATE_LIMIT_PATTERN = /you can only request this after \d+ seconds/i;
const RATE_LIMIT_MSG = "Too many attempts. Please wait a moment and try again.";

const DEFAULT_ERROR = "Something went wrong. Please try again.";

export function mapAuthError(rawMessage: string): string {
  if (RATE_LIMIT_PATTERN.test(rawMessage)) return RATE_LIMIT_MSG;
  return ERROR_MAP[rawMessage] ?? DEFAULT_ERROR;
}
