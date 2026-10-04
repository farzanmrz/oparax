import Link from "next/link";
import { AuthStage, CardNotice, CardTitle, link } from "@/components/auth/one-card";
import { authContent } from "@/lib/auth/content";
import { cn } from "@/lib/utils";
import { ResetPasswordForm } from "./reset-password-form";

// Set-new-password page, recovery email links land here (via
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
    <AuthStage>
      <CardTitle>{authContent.resetTitle}</CardTitle>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-t2">{authContent.resetSubtitle}</p>
      {error ? (
        <div className="mt-5">
          <CardNotice tone="error">{error}</CardNotice>
        </div>
      ) : null}
      <ResetPasswordForm tokenHash={token_hash} tokenType={type} />
      <p className="mt-5 text-center text-[13px]">
        <Link href="/forgot-password" className={cn("font-medium", link)}>
          {authContent.requestReset}
        </Link>
      </p>
    </AuthStage>
  );
}
