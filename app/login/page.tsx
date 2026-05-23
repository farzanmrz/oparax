import { LoginForm } from "@/components/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <div className="auth-page">
      <div className="auth-container">
        <LoginForm error={error} message={message} />
      </div>
    </div>
  )
}
