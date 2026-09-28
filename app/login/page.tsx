import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthAlert, AuthShell } from "@/components/auth-shell";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { authContent } from "@/lib/auth/content";
import { signedInDestination } from "@/lib/auth/oauth";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error, message, next } = await searchParams;
  if (user) redirect(await signedInDestination(next));

  return (
    <>
      <PostHogUserContext id={null} email={undefined} />
      <AuthShell
        title={authContent.loginTitle}
        subtitle={authContent.loginSubtitle}
        footer={
          <>
            <p>
              <Link
                href="/forgot-password"
                className="text-foreground underline underline-offset-4"
              >
                {authContent.forgotPassword}
              </Link>
            </p>
            <p>
              {authContent.noAccount}{" "}
              <Link href="/signup" className="text-foreground underline underline-offset-4">
                {authContent.signup}
              </Link>
            </p>
          </>
        }
      >
        <div className="space-y-4">
          {error && <AuthAlert tone="error">{error}</AuthAlert>}
          {message && <AuthAlert tone="notice">{message}</AuthAlert>}
          <LoginForm next={safeNextPath(next) ?? undefined} />
        </div>
      </AuthShell>
    </>
  );
}
