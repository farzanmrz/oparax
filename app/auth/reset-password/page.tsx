import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

// Stub set-new-password page — recovery email links land here (via
// app/auth/confirm) carrying the one-time token, which the form submits
// together with the new password so the token is never consumed on GET.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    token_hash?: string;
    type?: string;
  }>;
}) {
  const { error, token_hash, type } = await searchParams;

  return (
    <main className="mx-auto max-w-sm space-y-4 p-8">
      <h1>Set a new password</h1>
      {error && <p role="alert">{error}</p>}
      <ResetPasswordForm tokenHash={token_hash} tokenType={type} />
      <p>
        <Link href="/forgot-password">Request a new reset link</Link>
      </p>
    </main>
  );
}
