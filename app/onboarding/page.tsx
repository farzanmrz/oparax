import { redirect } from "next/navigation";
import { RefreshXIdentityButton } from "@/components/auth/refresh-x-identity";
import { BrandRow, liftHigh, Stage } from "@/components/one/stage";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { readAuthContext } from "@/lib/auth/identity";
import { signedInDestination } from "@/lib/auth/oauth";
import { guards } from "@/lib/guards/guards";
import { reportServerException } from "@/lib/observability/posthog-server";
import { onboardingContent, setupErrorSchema } from "@/lib/onboarding/content";
import { cn } from "@/lib/utils";
import { SetupForm } from "./setup-form";
import { SetupSample } from "./setup-sample";

/** The One setup page: the title, then the form on its lifted card with the sample run beside it. */
function SetupStage({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Stage light={640}>
      <BrandRow />
      <main className="relative mx-auto w-full max-w-[1240px] px-4 pt-8 pb-16 desk:px-8">
        <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
          {onboardingContent.title}
        </h1>
        <p className="mt-2.5 text-[14px] text-t2">{onboardingContent.subtitle}</p>
        <div className="mt-6 grid items-start gap-8 desk:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
          <div className={cn(liftHigh, "p-6")}>{children}</div>
          {aside}
        </div>
      </main>
    </Stage>
  );
}

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
        <SetupStage>
          <div className="flex flex-col gap-4">
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
      <SetupStage aside={<SetupSample />}>
        <SetupForm
          verifiedHandle={xIdentity.status === "ok" ? xIdentity.displayHandle : null}
          buildsOpen={!guard.killSwitch && guard.buildsOpen}
          error={code}
        />
      </SetupStage>
    </>
  );
}
