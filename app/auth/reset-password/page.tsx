import Link from "next/link";
import { AuthAlert, AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

// Set-new-password page — recovery email links land here (via
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
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your account."
      footer={
        <p>
          <Link href="/forgot-password" className="text-foreground underline underline-offset-4">
            Request a new reset link
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <ResetPasswordForm tokenHash={token_hash} tokenType={type} />
      </div>
    </AuthShell>
  );
}
