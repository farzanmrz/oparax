import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { AuthAlert, AuthShell } from "@/components/auth-shell";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { Separator } from "@/components/ui/separator";
import { authContent } from "@/lib/auth/content";
import { signedInDestination } from "@/lib/auth/oauth";
import { createClient } from "@/lib/supabase/server";
import { safeAuthDestination } from "@/lib/validation";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error, next } = await searchParams;
  if (user) redirect(await signedInDestination(next));

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
        <div className="flex flex-col gap-4">
          {error && <AuthAlert tone="error">{error}</AuthAlert>}
          <ProviderButtons next={safeAuthDestination(next) ?? undefined} />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Separator className="flex-1" />
            <span>{authContent.or}</span>
            <Separator className="flex-1" />
          </div>
          <h2 className="text-sm font-medium">{authContent.emailSignup}</h2>
          <SignupForm />
        </div>
      </AuthShell>
    </>
  );
}
