import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthAlert, AuthShell } from "@/components/auth-shell";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { authContent } from "@/lib/auth/content";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

// Signup page: branded shell around the existing signupAction form. The
// error param arrives from the email-confirmation handler and renders as an
// alert above the form. Signed-in users never see auth forms; they are returned to /.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <>
      <PostHogUserContext id={null} email={undefined} />
      <AuthShell
        title={authContent.signupTitle}
        subtitle={authContent.signupSubtitle}
        footer={
          <p>
            {authContent.existingAccount}{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              {authContent.login}
            </Link>
          </p>
        }
      >
        <div className="space-y-4">
          {error && <AuthAlert tone="error">{error}</AuthAlert>}
          <SignupForm />
        </div>
      </AuthShell>
    </>
  );
}
