import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = { title: "Onboarding", robots: { index: false } };

// Every build spends money on X and the model, so outside local development it is behind the login.
export default async function OnboardingPage() {
  if (process.env.NODE_ENV !== "development") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }
  return <OnboardingClient />;
}
