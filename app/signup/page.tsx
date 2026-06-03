import { redirect } from "next/navigation"

// The signup UI now lives in the landing-page auth modal. This route stays as a
// thin redirect so existing /signup links keep working — it forwards to the
// landing page, which auto-opens the signup modal.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const params = new URLSearchParams({ auth: "signup" })
  if (error) params.set("error", error)

  redirect(`/?${params.toString()}`)
}
