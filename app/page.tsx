import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LandingPage } from "@/components/landing/landing-page"
import type { AuthView } from "@/components/landing/auth-modal"

const AUTH_VIEWS: readonly AuthView[] = ["login", "signup", "forgot"]

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; error?: string; message?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Signed-in users go straight to the app; everyone else sees the landing page.
  if (user) redirect("/dashboard")

  // ?auth=login|signup|forgot (set by the /login, /signup, /forgot-password
  // redirects) auto-opens the matching auth modal. error/message are surfaced
  // inside it — e.g. the "Password updated successfully" notice after a reset.
  const { auth, error, message } = await searchParams
  const initialView = AUTH_VIEWS.includes(auth as AuthView)
    ? (auth as AuthView)
    : null

  return (
    <LandingPage
      initialView={initialView}
      initialError={error}
      initialMessage={message}
    />
  )
}
