import { PhaseList } from "@/components/one/phases";
import { column, OneShell } from "@/components/one/shell";
import { SourceTable } from "@/components/one/source-table";
import { monitorContent } from "@/lib/monitor/content";
import { restPhases } from "@/lib/onboarding/phases";

/**
 * The One onboarding at rest inside the shell (the person has no agent yet): the page line the children hold, then
 * the seven phases with empty rings beside the shared source table every run starts from. No right column.
 */
export function SetupStage({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  return (
    <OneShell email={email} monitor={null}>
      <main className={`${column} relative flex-1 pt-7 pb-24`}>
        {children}
        <div className="mt-6 grid grid-cols-1 items-start gap-6 desk:grid-cols-[264px_minmax(0,1fr)]">
          <PhaseList phases={restPhases} />
          <section aria-label={monitorContent.onboarding.tableLabel} className="min-w-0">
            <SourceTable />
          </section>
        </div>
      </main>
    </OneShell>
  );
}
