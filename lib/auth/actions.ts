"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authContent } from "@/lib/auth/content";
import { authProviderSchema, requestSigninLink, signedInDestination } from "@/lib/auth/oauth";
import { mapAuthError } from "@/lib/auth-errors";
import { getSiteOrigin } from "@/lib/site-origin";
import { createClient } from "@/lib/supabase/server";
import {
  isValidationError,
  safeAuthDestination,
  validateAuthForm,
  validateEmailForm,
  validateResetPasswordForm,
  validateSignupForm,
} from "@/lib/validation";

export interface AuthFormState {
  error?: string;
  message?: string;
  /** Signup succeeded, a confirmation email was sent to `email`. */
  signupComplete?: boolean;
  /**
   * The submitted email, echoed back on every error return: React 19 resets
   * uncontrolled inputs when a form action completes (even with an error
   * state), so the forms repopulate the email field from here.
   */
  email?: string;
}

/**
 * Graceful auth failures return form state. Only operationally actionable failures are logged:
 * an ordinary wrong password or duplicate signup is expected user input. Logs stay generic so
 * passwords, emails, Supabase's raw message, and session data never leave the action.
 */
function captureAuthFailure(operation: "login" | "signup", rawMessage: string) {
  const mappedMessage = mapAuthError(rawMessage);
  const failureClass =
    mappedMessage === authContent.invalidCredentials
      ? "invalid_credentials"
      : mappedMessage === authContent.rateLimited
        ? "rate_limited"
        : mappedMessage === authContent.signupFailed
          ? "already_registered"
          : "unexpected";

  if (failureClass === "invalid_credentials" || failureClass === "already_registered") return;

  console.warn("auth: operation failed", {
    operation,
    failure_class: failureClass,
  });
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
    captureAuthFailure("login", error.message);
    return {
      error: mapAuthError(error.message),
      email,
    };
  }

  redirect(await signedInDestination(formData.get("next")));
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
  });

  if (error) {
    captureAuthFailure("signup", error.message);
    return {
      error: mapAuthError(error.message),
      email,
    };
  }

  if (data.user?.identities?.length === 0) {
    captureAuthFailure("signup", "User already registered");
    return {
      signupComplete: true,
      email,
    };
  }

  if (data.session) {
    redirect(await signedInDestination(null));
  }

  // No session yet, email confirmation pending. The signup form swaps to a
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
    message: authContent.resetSent,
  };
}

const INVALID_RESET_LINK_MESSAGE = authContent.resetInvalid;

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

  // No session yet, consume the one-time recovery token from the email link.
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
  // already X is a no-op, blocking on it only confuses people who
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

  // Done, drop the recovery session and seed the login page with the
  // success notice, mirroring the email-verification flow.
  await supabase.auth.signOut();
  redirect(`/login?message=${encodeURIComponent(authContent.passwordUpdated)}`);
}

export async function signInWithProvider(
  provider: "google" | "x",
  next: string | undefined,
  _previous: AuthFormState,
  _formData: FormData,
): Promise<AuthFormState> {
  const parsed = authProviderSchema.safeParse(provider);
  if (!parsed.success) return { error: authContent.signinFailed };
  const redirectTo = new URL("/auth/confirm", await getSiteOrigin());
  const destination = safeAuthDestination(next);
  if (destination) redirectTo.searchParams.set("next", destination);
  redirectTo.searchParams.set("method", "oauth");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsed.data,
    options: { redirectTo: redirectTo.toString() },
  });
  if (error || !data.url) return { error: authContent.signinFailed };
  redirect(data.url);
}

export async function emailSigninLink(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = z.email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: authContent.emailInvalid };
  const result = await requestSigninLink(parsed.data, formData.get("next"), await getSiteOrigin());
  return { message: result.message, email: parsed.data };
}
