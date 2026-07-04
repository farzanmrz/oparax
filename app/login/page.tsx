import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

// Stub login page — a plain form wired to the existing loginAction. The
// error/message params arrive from the auth email flows (signup verification,
// password reset) and render as plain text above the form. Signed-in users
// never see auth forms (same bounce the landing page applies).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { error, message } = await searchParams;

  return (
    <main className="mx-auto max-w-sm space-y-4 p-8">
      <h1>Log in</h1>
      {error && <p role="alert">{error}</p>}
      {message && <p>{message}</p>}
      <LoginForm />
      <p>
        <Link href="/forgot-password">Forgot password?</Link>
      </p>
      <p>
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
