import { PageLine } from "@/components/one/app-shell";
import { OneShell } from "@/components/one/shell";
import { Timeline } from "@/components/one/timeline";
import { monitorContent } from "@/lib/monitor/content";
import { restPhases } from "@/lib/onboarding/phases";

/**
 * The One onboarding at rest inside the shell (owner, Oct 10: "The onboarding sidebar at rest is locked"): the rail
 * holds the Oparax head, the seven steps with empty rings and the foot; the heading "Setup Feed Agent" stands alone
 * on its line and the centre is the one card the children hold.
 */
export function SetupStage({
  email,
  notice,
  children,
}: {
  email: string | null;
  /** Shown above the heading; the development preview's banner. */
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <OneShell email={email} agent={null} middle={<Timeline phases={restPhases} />}>
      {notice}
      <PageLine title={monitorContent.onboarding.heading} home="/onboarding" />
      <div className="mt-6">{children}</div>
    </OneShell>
  );
}
