"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateAuthForm, isValidationError } from "@/lib/validation";
import { mapAuthError } from "@/lib/auth-errors";

export async function login(formData: FormData) {
  const validated = validateAuthForm(formData);
  if (isValidationError(validated)) {
    redirect(`/login?error=${encodeURIComponent(validated.message)}`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(mapAuthError(error.message))}`);
  }

  redirect("/dashboard");
}
