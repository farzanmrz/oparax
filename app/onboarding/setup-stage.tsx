import { OneFrame } from "@/components/one/frame";
import { PhaseList } from "@/components/one/phases";
import { column, OneShell } from "@/components/one/shell";
import { stepsAside } from "@/components/one/stage";
import { onboardingContent } from "@/lib/onboarding/content";
import { restPhases } from "@/lib/onboarding/phases";

/**
 * The One onboarding at rest inside the shell (the person has no agent yet): the title band, the seven steps with
 * empty rings in the lifted aside, and the one card the children hold. No right column before the profile exists.
 */
export function SetupStage({
  email,
  notice,
  children,
}: {
  email: string | null;
  /** Shown above the title band; the development preview's banner. */
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <OneShell email={email} monitor={null}>
      <main className={`${column} relative flex-1 pt-7 pb-24`}>
        {notice}
        <OneFrame
          title={onboardingContent.title}
          aside={stepsAside(<PhaseList phases={restPhases} />)}
        >
          {children}
        </OneFrame>
      </main>
    </OneShell>
  );
}
