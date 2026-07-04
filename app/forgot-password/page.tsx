import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordForm } from "./forgot-password-form";

// Stub forgot-password page — a plain form wired to the existing
// resetPasswordAction (sends the recovery email). The error param arrives
// from the email-confirmation handler when a recovery link is invalid.
// Signed-in users bounce to the app (dev parity); /auth/reset-password is
// deliberately NOT guarded — the recovery flow must render while a recovery
// session exists.
export default async function ForgotPasswordPage({
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
      <h1>Forgot password</h1>
      {error && <p role="alert">{error}</p>}
      {message && <p>{message}</p>}
      <ForgotPasswordForm />
      <p>
        <Link href="/login">Back to log in</Link>
      </p>
    </main>
  );
}
