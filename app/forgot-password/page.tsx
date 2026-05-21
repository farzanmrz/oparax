import { ForgotPasswordForm } from "@/components/forgot-password-form"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 32rem), radial-gradient(circle at 95% 85%, color-mix(in oklch, var(--accent) 20%, transparent), transparent 30rem), var(--background)",
      }}
    >
      <div className="w-full max-w-sm md:max-w-4xl">
        <ForgotPasswordForm error={error} message={message} />
      </div>
    </div>
  )
}
