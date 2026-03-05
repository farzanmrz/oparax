import { ResetPasswordForm } from "@/components/reset-password-form"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token_hash?: string; type?: string }>
}) {
  const { error, token_hash, type } = await searchParams
  const recoveryType = type === "recovery" ? type : undefined

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <ResetPasswordForm
          error={error}
          tokenHash={token_hash}
          type={recoveryType}
        />
      </div>
    </div>
  )
}
