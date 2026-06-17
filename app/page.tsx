import { redirect } from "next/navigation";
import type { AuthView } from "@/components/landing/auth-modal";
import { LandingPage } from "@/components/landing/landing-page";
import { createClient } from "@/lib/supabase/server";

const AUTH_VIEWS: readonly AuthView[] = ["login", "signup", "forgot", "reset"];

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{
    auth?: string;
    error?: string;
    message?: string;
    token_hash?: string;
    type?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in users go straight to the app; everyone else sees the landing page.
  if (user) redirect("/dashboard");

  // ?auth=login|signup|forgot|reset (set by the /login, /signup,
  // /forgot-password redirects and the auth/confirm email handler)
  // auto-opens the matching auth modal. error/message are surfaced inside it —
  // e.g. "Email verified successfully" after a signup confirmation — and the
  // reset view receives the one-time recovery token from the email link.
  const { auth, error, message, token_hash, type } = await searchParams;
  const initialView = AUTH_VIEWS.includes(auth as AuthView) ? (auth as AuthView) : null;

  return (
    <LandingPage
      initialView={initialView}
      initialError={error}
      initialMessage={message}
      tokenHash={token_hash}
      tokenType={type === "recovery" ? "recovery" : undefined}
    />
  );
}
