import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthAlert, AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordForm } from "./forgot-password-form";

// Forgot-password page — branded shell around the existing
// resetPasswordAction form (sends the recovery email). The error param
// arrives from the email-confirmation handler when a recovery link is
// invalid. Signed-in users bounce to the app (dev parity);
// /auth/reset-password is deliberately NOT guarded — the recovery flow must
// render while a recovery session exists.
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
  if (user) redirect("/agents");

  const { error, message } = await searchParams;

  return (
    <AuthShell
      title="Forgot password"
      subtitle={"We'll email you a link to reset it."}
      footer={
        <p>
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Back to log in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        {message && <AuthAlert tone="notice">{message}</AuthAlert>}
        <ForgotPasswordForm />
      </div>
    </AuthShell>
  );
}
