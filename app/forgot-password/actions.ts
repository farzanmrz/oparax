"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError } from "@/lib/auth-errors";
import { isValidationError, validateEmailForm } from "@/lib/validation";

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

async function getPasswordResetRedirectUrl(): Promise<string> {
  return new URL("/auth/reset-password", await getSiteOrigin()).toString();
}

export async function requestPasswordReset(formData: FormData) {
  const validated = validateEmailForm(formData);
  if (isValidationError(validated)) {
    redirect(`/forgot-password?error=${encodeURIComponent(validated.message)}`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
    redirectTo: await getPasswordResetRedirectUrl(),
  });

  if (error) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(mapAuthError(error.message))}`
    );
  }

  redirect(
    `/forgot-password?message=${encodeURIComponent(
      "If an account exists for this email, we sent a password reset link."
    )}`
  );
}
