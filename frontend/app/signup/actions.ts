"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateSignupForm, isValidationError } from "@/lib/validation";
import { mapAuthError } from "@/lib/auth-errors";

export async function signup(formData: FormData) {
  const validated = validateSignupForm(formData);
  if (isValidationError(validated)) {
    redirect(`/signup?error=${encodeURIComponent(validated.message)}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(mapAuthError(error.message))}`);
  }

  if (data.user?.identities?.length === 0) {
    redirect(
      `/signup?error=${encodeURIComponent("An account with this email already exists. Please sign in instead.")}`
    );
  }

  redirect("/signup/check-email");
}
