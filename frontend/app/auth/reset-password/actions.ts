"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError } from "@/lib/auth-errors";
import {
  isValidationError,
  validateResetPasswordForm,
} from "@/lib/validation";

const INVALID_RESET_LINK_MESSAGE =
  "Your password reset link is invalid or has expired. Please request a new one.";

export async function updatePassword(formData: FormData) {
  const validated = validateResetPasswordForm(formData);
  if (isValidationError(validated)) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent(validated.message)}`
    );
  }

  const tokenHash = formData.get("token_hash");
  const tokenType = formData.get("type");
  const hasRecoveryToken =
    typeof tokenHash === "string" && tokenHash.length > 0;
  const isRecoveryType = tokenType === "recovery";

  const supabase = await createClient();
  let {
    data: userData,
    error: getUserError,
  } = await supabase.auth.getUser();

  if (!userData.user && hasRecoveryToken && isRecoveryType) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });

    if (!verifyError) {
      const userAfterVerify = await supabase.auth.getUser();
      userData = userAfterVerify.data;
      getUserError = userAfterVerify.error;
    }
  }

  if (getUserError || !userData.user) {
    redirect(`/login?error=${encodeURIComponent(INVALID_RESET_LINK_MESSAGE)}`);
  }

  const { error } = await supabase.auth.updateUser({
    password: validated.password,
  });
  if (error) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent(mapAuthError(error.message))}`
    );
  }

  await supabase.auth.signOut();

  redirect(
    `/login?message=${encodeURIComponent(
      "Password updated successfully. Please sign in."
    )}`
  );
}
