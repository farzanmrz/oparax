import { ForgotPasswordForm } from "@/components/forgot-password-form"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <div className="auth-page">
      <div className="auth-container">
        <ForgotPasswordForm error={error} message={message} />
      </div>
    </div>
  )
}
