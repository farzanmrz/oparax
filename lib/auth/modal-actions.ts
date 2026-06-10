"use server";

// Stateful auth actions for the landing-page auth modal.
//
// These mirror the routed Server Actions in app/{login,signup,forgot-password}/actions.ts
// but RETURN an { error } / { message } state instead of redirecting on failure, so the
// modal can show feedback inline without navigating away. Success paths still redirect()
// exactly like the routed versions. Validation, error mapping, and the Supabase client are
// reused verbatim — the routed auth pages are left completely untouched.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError } from "@/lib/auth-errors";
import {
  isValidationError,
  validateAuthForm,
  validateEmailForm,
  validateSignupForm,
} from "@/lib/validation";

export interface AuthFormState {
  error?: string;
  message?: string;
  /** Signup succeeded — a confirmation email was sent to `email`. */
  signupComplete?: boolean;
  email?: string;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function getSiteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    return trimTrailingSlash(origin);
  }

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host) {
    const protocol =
      requestHeaders.get("x-forwarded-proto") ??
      (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  );
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = validateAuthForm(formData);
  if (isValidationError(validated)) {
    return { error: validated.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = validateSignupForm(formData);
  if (isValidationError(validated)) {
    return { error: validated.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  if (data.user?.identities?.length === 0) {
    return {
      error:
        "An account with this email already exists. Please log in instead.",
    };
  }

  if (data.session) {
    redirect("/dashboard/connect-x");
  }

  // No session yet — email confirmation pending. The modal swaps the form
  // for a "check your email" notice instead of navigating away.
  return { signupComplete: true, email: validated.email };
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = validateEmailForm(formData);
  if (isValidationError(validated)) {
    return { error: validated.message };
  }

  const supabase = await createClient();
  const redirectTo = new URL(
    "/auth/reset-password",
    await getSiteOrigin()
  ).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
    redirectTo,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  return {
    message:
      "If an account exists for this email, we sent a password reset link.",
  };
}
