import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { brief, chosenAccounts, chosenSites } from "../data/onboarding";
import { KindIcon, kindLabel } from "../source-kind";

// First-visit state of the feed (the ready summary). It shows what the agent chose, from persisted public
// data only (monitors.brief, monitor_sources, monitor_accounts with their why); scores stay out.
// Round 1 change 16: the brief stays visible and the two lists start closed, so the feed sits near the top.
function Row({ kind, name, sub, why }: { kind: "rss" | "website" | "x_account"; name: string; sub: string; why: string }) {
  return (
    <li className="flex gap-2.5 py-2.5">
      <KindIcon kind={kind} className="mt-0.5 size-5" />
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-medium">{name}</span>
          <span className="ml-1.5 text-muted-foreground">{sub}</span>
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{why}</p>
      </div>
    </li>
  );
}

function Disclosure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Collapsible className="border-t border-border">
      <CollapsibleTrigger className="group flex h-11 w-full items-center gap-2 text-left text-sm font-medium hover:text-foreground">
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90"
          aria-hidden="true"
        />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="divide-y divide-border pb-2 pl-6">{children}</ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ReadyPanel() {
  return (
    <section aria-labelledby="ready-title" className="rounded-xl border border-border bg-card p-6">
      <h2 id="ready-title" className="text-xl font-semibold tracking-tight">
        Your agent is ready
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This is what it chose for your sentence. You can see it any time in Settings.
      </p>
      <div className="mt-5 rounded-lg bg-muted/60 px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">Your brief</p>
        <p className="mt-1 text-sm leading-relaxed">{brief.summary}</p>
      </div>
      <div className="mt-4">
        <Disclosure label={`${chosenSites.length} sites and feeds`}>
          {chosenSites.map((s) => (
            <Row key={s.id} kind={s.kind} name={s.name} sub={kindLabel[s.kind]} why={s.why} />
          ))}
        </Disclosure>
        <Disclosure label={`${chosenAccounts.length} X accounts`}>
          {chosenAccounts.map((a) => (
            <Row key={a.id} kind="x_account" name={a.handle} sub={a.name} why={a.why} />
          ))}
        </Disclosure>
      </div>
    </section>
  );
}
