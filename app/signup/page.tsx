import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

// Stub signup page — a plain form wired to the existing signupAction. The
// error param arrives from the email-confirmation handler and renders as
// plain text above the form. Signed-in users never see auth forms (same
// bounce the landing page applies).
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
    <main className="mx-auto max-w-sm space-y-4 p-8">
      <h1>Sign up</h1>
      {error && <p role="alert">{error}</p>}
      <SignupForm />
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
