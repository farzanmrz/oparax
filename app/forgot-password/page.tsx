import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthStage, CardNotice, CardTitle, link } from "@/components/auth/one-card";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { authContent } from "@/lib/auth/content";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ForgotPasswordForm } from "./forgot-password-form";

// Forgot-password page: the One card around the existing
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
      <AuthStage>
        <CardTitle>{authContent.forgotTitle}</CardTitle>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-t2">{authContent.forgotSubtitle}</p>
        {error || message ? (
          <div className="mt-5 grid gap-2">
            {error ? <CardNotice tone="error">{error}</CardNotice> : null}
            {message ? <CardNotice tone="notice">{message}</CardNotice> : null}
          </div>
        ) : null}
        <ForgotPasswordForm />
        <p className="mt-5 text-center text-[13px]">
          <Link href="/login" className={cn("font-medium", link)}>
            {authContent.backToLogin}
          </Link>
        </p>
      </AuthStage>
    </>
  );
}
