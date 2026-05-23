import { SignupForm } from "@/components/signup-form"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="auth-page">
      <div className="auth-container">
        <SignupForm error={error} />
      </div>
    </div>
  )
}
