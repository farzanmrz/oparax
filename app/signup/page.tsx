import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthAlert, AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

// Signup page — branded shell around the existing signupAction form. The
// error param arrives from the email-confirmation handler and renders as an
// alert above the form. Signed-in users never see auth forms (same bounce
// the landing page applies).
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
  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <AuthShell
      title="Sign up"
      subtitle="Put an AI news desk on your beat."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Log in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <SignupForm />
      </div>
    </AuthShell>
  );
}
