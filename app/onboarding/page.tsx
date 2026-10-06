import { redirect } from "next/navigation";
import { RefreshXIdentityButton } from "@/components/auth/refresh-x-identity";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { readAuthContext } from "@/lib/auth/identity";
import { signedInDestination } from "@/lib/auth/oauth";
import { guards } from "@/lib/guards/guards";
import { reportServerException } from "@/lib/observability/posthog-server";
import { onboardingContent, setupErrorSchema } from "@/lib/onboarding/content";
import { SetupForm } from "./setup-form";
import { SetupStage } from "./setup-stage";

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
        <SetupStage email={user.email ?? null}>
          <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
            {onboardingContent.title}
          </h1>
          <div className="mt-4 flex flex-col items-start gap-3">
            <p role="alert" className="text-[13.5px] leading-relaxed text-[var(--error)]">
              {onboardingContent.xIdentityUnreadable}
            </p>
            <RefreshXIdentityButton />
          </div>
        </SetupStage>
      </>
    );
  }

  const [{ error }, guard] = await Promise.all([searchParams, guards()]);
  const code = setupErrorSchema.safeParse(error).data;
  return (
    <>
      <PostHogUserContext id={user.id} email={user.email} />
      <SetupStage email={user.email ?? null}>
        <SetupForm
          verifiedHandle={xIdentity.status === "ok" ? xIdentity.displayHandle : null}
          buildsOpen={!guard.killSwitch && guard.buildsOpen}
          error={code}
        />
      </SetupStage>
    </>
  );
}
