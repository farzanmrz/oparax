import { redirect } from "next/navigation"
import { SignupForm } from "@/components/signup-form"
import { createClient } from "@/lib/supabase/server"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  const { error } = await searchParams

  return (
    <div className="auth-page">
      <div className="auth-container">
        <SignupForm error={error} />
      </div>
    </div>
  )
}
