import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { createClient } from "@/lib/supabase/server"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  const { error, message } = await searchParams

  return (
    <div className="auth-page">
      <div className="auth-container">
        <LoginForm error={error} message={message} />
      </div>
    </div>
  )
}
