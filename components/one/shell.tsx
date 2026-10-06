import { Stage } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import { monitorState, TRIAL_DAYS } from "@/lib/monitor-state";
import { settingsContent } from "@/lib/settings/content";
import type { Tables } from "@/lib/supabase/database.types";
import { OneHeader, type ShellPlan } from "./header";

// The One shell on the owner's signed-in pages (design preview v2/one/shell.tsx, pass 16): the page ground and one
// running header line, its content in the page column (DESIGN.md Width, the .one-column class in globals.css).

/** The one column every signed-in page and the header sit in. */
export const column = "one-column";

export type ShellMonitor = Pick<
  Tables<"monitors">,
  | "handle"
  | "status"
  | "trial_started_at"
  | "paid_through"
  | "tier"
  | "pool_limit"
  | "pool_used"
  | "cadence"
  | "budget_exhausted_at"
>;

const tierNames = new Map<string, string>(Object.entries(settingsContent.billing.tiers));

function planOf(monitor: ShellMonitor): ShellPlan | null {
  const free = monitor.tier === "free";
  // The free week starts when the build succeeds; until then there is no plan to show and no countdown.
  if (free && !monitor.trial_started_at) return null;
  return {
    name: tierNames.get(monitor.tier) ?? settingsContent.billing.unknownTier,
    daysLeft: free ? monitorState(monitor).daysLeft : null,
    days: TRIAL_DAYS,
    used: monitor.pool_used,
    limit: monitor.pool_limit,
  };
}

/**
 * The ground and the header. `email` is the signed-in address; `monitor` is the person's own agent, or null before
 * they have one (Feed then leads to onboarding, Settings is hidden and there is no plan).
 */
export function OneShell({
  email,
  monitor,
  skip,
  light,
  className,
  children,
}: {
  email: string | null;
  monitor: ShellMonitor | null;
  /** The skip link to the page's main content, first in the tab order. */
  skip?: { href: string; label: string };
  light?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Stage light={light} className={className}>
      {skip ? (
        <a
          href={skip.href}
          className="sr-only rounded-md focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-50 focus:bg-background focus:p-3 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {skip.label}
        </a>
      ) : null}
      <OneHeader
        label={email ?? monitorContent.menu.account}
        feed={monitor ? `/${monitor.handle}` : "/onboarding"}
        settings={monitor ? `/${monitor.handle}/settings` : null}
        plan={monitor ? planOf(monitor) : null}
      />
      {children}
    </Stage>
  );
}
