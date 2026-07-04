import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthAlert, AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

// Login page — branded shell around the existing loginAction form. The
// error/message params arrive from the auth email flows (signup verification,
// password reset) and render as alerts above the form. Signed-in users
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
    <AuthShell
      title="Log in"
      subtitle="Back to the desk."
      footer={
        <>
          <p>
            <Link href="/forgot-password" className="text-foreground underline underline-offset-4">
              Forgot password?
            </Link>
          </p>
          <p>
            No account?{" "}
            <Link href="/signup" className="text-foreground underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </>
      }
    >
      <div className="space-y-4">
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        {message && <AuthAlert tone="notice">{message}</AuthAlert>}
        <LoginForm />
      </div>
    </AuthShell>
  );
}
