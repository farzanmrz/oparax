import { redirect } from "next/navigation";
import { RefreshXIdentityButton } from "@/components/auth/refresh-x-identity";
import { AuthShell } from "@/components/auth-shell";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { readAuthContext } from "@/lib/auth/identity";
import { signedInDestination } from "@/lib/auth/oauth";
import { guards } from "@/lib/guards/guards";
import { reportServerException } from "@/lib/observability/posthog-server";
import { onboardingContent, setupErrorSchema } from "@/lib/onboarding/content";
import { SetupForm } from "./setup-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { user, monitor, xIdentity } = await readAuthContext();
  if (!user) redirect("/signup");
  if (monitor) redirect(await signedInDestination(null));

  if (xIdentity.status === "invalid") {
    reportServerException(new Error("auth identity_parse"), {
      tags: { area: "auth", stage: "identity_parse", reason: xIdentity.reason },
      distinctId: user.id,
    });
    return (
      <>
        <PostHogUserContext id={user.id} email={user.email} />
        <AuthShell title={onboardingContent.title}>
          <div className="flex flex-col gap-4">
            <p role="alert" className="text-sm leading-relaxed text-destructive">
              {onboardingContent.xIdentityUnreadable}
            </p>
            <RefreshXIdentityButton />
          </div>
        </AuthShell>
      </>
    );
  }

  const [{ error }, guard] = await Promise.all([searchParams, guards()]);
  const code = setupErrorSchema.safeParse(error).data;
  return (
    <>
      <PostHogUserContext id={user.id} email={user.email} />
      <AuthShell title={onboardingContent.title}>
        <SetupForm
          verifiedHandle={xIdentity.status === "ok" ? xIdentity.displayHandle : null}
          buildsOpen={!guard.killSwitch && guard.anonBuildsOpen}
          error={code}
        />
      </AuthShell>
    </>
  );
}
