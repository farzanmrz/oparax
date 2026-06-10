import { ResetPasswordForm } from "@/components/reset-password-form"

import "@/app/auth-pages.css"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token_hash?: string; type?: string }>
}) {
  const { error, token_hash, type } = await searchParams
  const recoveryType = type === "recovery" ? type : undefined

  return (
    <div className="auth-shell">
      <ResetPasswordForm
        error={error}
        tokenHash={token_hash}
        type={recoveryType}
      />
    </div>
  )
}
