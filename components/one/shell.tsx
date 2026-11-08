import { AppShell, type ShellPerson } from "@/components/one/app-shell";
import { monitorContent } from "@/lib/monitor/content";
import { asideGroups } from "@/lib/monitor/present";
import type { MonitorSources, Profile } from "@/lib/monitor/read";
import { feedHref } from "@/lib/monitor/routes";

// The One shell on the signed-in pages (lab v2/one/shell.tsx AppShell): the rail at the left with the four pages and
// the agent's sources as the feed's filters, the page in its column beside it. The page passes what it has read:
// the person's agent (or none before the build), its sources for the Filter group, and which source the feed shows.

export type ShellAgent = {
  handle: string;
  display_handle: string;
  profile: Profile | null;
};

/** The person in the rail's foot: the profile's name, else the handle, else the signed-in address. */
export function personOf(agent: ShellAgent | null, email: string | null): ShellPerson {
  const name = agent?.profile?.name || (agent ? `@${agent.display_handle}` : null) || email || "";
  const letters = name.replace(/^@/, "");
  return { name, initial: letters.charAt(0) || monitorContent.menu.account.charAt(0) };
}

/**
 * The rail and the ground. `agent` is the person's own agent, or null before they have one (the head then leads to
 * onboarding and `middle` holds the steps). `sources` fills the Filter group when the page has read them; `selected`
 * is the source the feed shows, `direct` whether the feed shows Direct, so a row keeps the view.
 */
export function OneShell({
  email,
  agent,
  sources = null,
  selected = null,
  direct = false,
  middle,
  light,
  className,
  children,
}: {
  email: string | null;
  agent: ShellAgent | null;
  sources?: MonitorSources | null;
  selected?: string | null;
  direct?: boolean;
  middle?: React.ReactNode;
  light?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const groups =
    agent && sources
      ? asideGroups(sources, {
          href: (key) => feedHref(agent.handle, direct, key === selected ? null : key),
          selected,
          counts: null,
        })
      : [];
  return (
    <AppShell
      home={agent ? `/${agent.handle}` : "/onboarding"}
      handle={agent?.handle ?? null}
      groups={groups}
      selected={selected}
      middle={middle}
      person={personOf(agent, email)}
      light={light}
      className={className}
    >
      {children}
    </AppShell>
  );
}
