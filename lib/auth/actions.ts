"use server";

// Stateful auth actions for the routed auth pages (/login, /signup,
// /forgot-password, /auth/reset-password).
//
// Each action RETURNS an { error } / { message } state instead of redirecting
// on failure, so the pages' useActionState forms can show feedback inline
// without navigating away. Success paths still redirect().

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { mapAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";
import { deriveUsernameFromEmail } from "@/lib/user";
import {
  isValidationError,
  validateAuthForm,
  validateEmailForm,
  validateResetPasswordForm,
  validateSignupForm,
} from "@/lib/validation";

export interface AuthFormState {
  error?: string;
  message?: string;
  /** Signup succeeded — a confirmation email was sent to `email`. */
  signupComplete?: boolean;
  /**
   * The submitted email, echoed back on every error return: React 19 resets
   * uncontrolled inputs when a form action completes (even with an error
   * state), so the forms repopulate the email field from here.
   */
  email?: string;
}

async function getSiteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    return origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host) {
    const protocol =
      requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email")?.toString();
  const validated = validateAuthForm(formData);
  if (isValidationError(validated)) {
    return {
      error: validated.message,
      email,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password,
  });

  if (error) {
    return {
      error: mapAuthError(error.message),
      email,
    };
  }

  redirect("/dashboard/agents");
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email")?.toString();
  const validated = validateSignupForm(formData);
  if (isValidationError(validated)) {
    return {
      error: validated.message,
      email,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
    // Seed a username from the email's local part. Stored in user_metadata;
    // shown in the sidebar and editable later in settings (lib/user.ts).
    options: {
      data: {
        username: deriveUsernameFromEmail(validated.email),
      },
    },
  });

  if (error) {
    return {
      error: mapAuthError(error.message),
      email,
    };
  }

  if (data.user?.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Please log in instead.",
      email,
    };
  }

  if (data.session) {
    redirect("/dashboard/agents");
  }

  // No session yet — email confirmation pending. The signup form swaps to a
  // "check your email" notice instead of navigating away.
  return {
    signupComplete: true,
    email: validated.email,
  };
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email")?.toString();
  const validated = validateEmailForm(formData);
  if (isValidationError(validated)) {
    return {
      error: validated.message,
      email,
    };
  }

  const supabase = await createClient();
  const redirectTo = new URL("/auth/reset-password", await getSiteOrigin()).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
    redirectTo,
  });

  if (error) {
    return {
      error: mapAuthError(error.message),
      email,
    };
  }

  return {
    message: "If an account exists for this email, we sent a password reset link.",
  };
}

const INVALID_RESET_LINK_MESSAGE =
  "Your password reset link is invalid or has expired. Please request a new one.";

export async function updatePasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const validated = validateResetPasswordForm(formData);
  if (isValidationError(validated)) {
    return {
      error: validated.message,
    };
  }

  const tokenHash = formData.get("token_hash");
  const tokenType = formData.get("type");
  const hasRecoveryToken = typeof tokenHash === "string" && tokenHash.length > 0;
  const isRecoveryType = tokenType === "recovery";

  const supabase = await createClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  // No session yet — consume the one-time recovery token from the email link.
  if (!user && hasRecoveryToken && isRecoveryType) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    if (!verifyError) {
      user = (await supabase.auth.getUser()).data.user;
    }
  }

  if (!user) {
    return {
      error: INVALID_RESET_LINK_MESSAGE,
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: validated.password,
  });

  // Re-setting the same password counts as success: the user proved account
  // ownership via the recovery link, and "set my password to X" when it is
  // already X is a no-op — blocking on it only confuses people who
  // subconsciously reuse their old password. The message match backs up the
  // code check for Auth servers that don't send error codes.
  const samePassword =
    error !== null &&
    (error.code === "same_password" ||
      error.message === "New password should be different from the old password.");

  if (error && !samePassword) {
    // The recovery session stays alive so the user can correct and resubmit
    // (the token is already consumed).
    return {
      error: mapAuthError(error.message),
    };
  }

  // Done — drop the recovery session and seed the login page with the
  // success notice, mirroring the email-verification flow.
  await supabase.auth.signOut();
  redirect(`/login?message=${encodeURIComponent("Password updated successfully. Please log in.")}`);
}
