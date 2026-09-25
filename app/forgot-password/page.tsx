import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthAlert, AuthShell } from "@/components/auth-shell";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordForm } from "./forgot-password-form";

// Forgot-password page: branded shell around the existing
// resetPasswordAction form (sends the recovery email). The error param
// arrives from the email-confirmation handler when a recovery link is
// invalid. Signed-in users never see auth forms; they are returned to /.
// /auth/reset-password is deliberately NOT guarded because the recovery flow must
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
  if (user) redirect("/");

  const { error, message } = await searchParams;

  return (
    <>
      <PostHogUserContext id={null} email={undefined} />
      <AuthShell
        title="Forgot Password"
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
    </>
  );
}
