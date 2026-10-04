import { Globe, Rss } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { SourceMark } from "@/components/one/marks";
import { lift } from "@/components/one/stage";
import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import type { MonitorSources } from "@/lib/monitor/read";
import { cn } from "@/lib/utils";
import { normalizeValidHandle } from "@/lib/x/handle";

// The One Sources page body (design preview v2/one/sources.tsx): one lifted section per kind, X accounts, RSS feeds
// and websites, the section header larger than its rows; a row opens in place to what it covers and why it was
// chosen. Empty kinds are left out. Unreadable and paused lines stay visible on the row.

type Row = {
  key: string;
  name: string;
  address: string;
  mark: string;
  href: string | null;
  focus: string | null;
  why: string;
  notes: { tone: "error" | "caution"; text: string }[];
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function OneSources({ data }: { data: MonitorSources }) {
  const today = new Date().toISOString().slice(0, 10);
  const accounts: Row[] = data.accounts.flatMap((account) => {
    const handle = normalizeValidHandle(account.handle);
    if (!handle) return [];
    return [
      {
        key: `x:${handle}`,
        name: account.name && account.name !== handle ? account.name : `@${handle}`,
        address: `@${handle}`,
        mark: handle,
        href: `https://x.com/${handle}`,
        focus: account.watched ? copy.watched : null,
        why: account.why,
        notes: [],
      },
    ];
  });
  const site = (kind: "rss" | "website"): Row[] =>
    data.sources.flatMap(({ source_id, why, sources: source }) => {
      if (!source || source.kind !== kind) return [];
      const notes: Row["notes"] = [];
      if (source.unreadable_streak > 0)
        notes.push({ tone: "error", text: copy.unreadable(source.unreadable_streak) });
      if (source.paused_at?.slice(0, 10) === today)
        notes.push({ tone: "caution", text: copy.sourcePaused });
      return [
        {
          key: source_id,
          name: source.name,
          address: hostOf(source.target),
          mark: hostOf(source.target),
          href: safeWebUrl(source.target),
          focus: source.focus,
          why,
          notes,
        },
      ];
    });
  const groups = [
    { kind: "x" as const, label: copy.onboarding.groups.x, rows: accounts },
    { kind: "rss" as const, label: copy.onboarding.groups.rss, rows: site("rss") },
    { kind: "website" as const, label: copy.onboarding.groups.website, rows: site("website") },
  ].filter((group) => group.rows.length);

  if (!groups.length) return <p className="mt-6 text-[14px] text-t2">{copy.noSourcesYet}</p>;
  return (
    <div className="mt-6 grid items-start gap-5 desk:grid-cols-2">
      {groups.map((group) => (
        <section key={group.kind} aria-label={group.label} className={cn(lift, "p-3")}>
          <h2 className="flex items-center gap-2 px-1.5 pb-2.5 text-[15px] font-semibold text-t1">
            <span className="text-t3">
              {group.kind === "x" ? (
                <BrandIcon name="x" className="size-3" />
              ) : group.kind === "rss" ? (
                <Rss className="size-3" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Globe className="size-3" strokeWidth={2} aria-hidden="true" />
              )}
            </span>
            {group.label}
            <span className="ml-auto text-[12px] font-normal text-t3 tabular-nums">
              {group.rows.length}
            </span>
          </h2>
          <ul>
            {group.rows.map((row) => (
              <li key={row.key}>
                <details className="group rounded-md open:bg-raised">
                  <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                    <SourceMark
                      kind={group.kind === "x" ? "x" : "site"}
                      mark={row.mark}
                      size={20}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-t1">{row.name}</span>
                      {row.address !== row.name ? (
                        <span className="block truncate text-[11.5px] text-t3">{row.address}</span>
                      ) : null}
                      {row.notes.map((note) => (
                        <span
                          key={note.text}
                          className={cn(
                            "block text-[11.5px]",
                            note.tone === "error" ? "text-[var(--error)]" : "text-[var(--caution)]",
                          )}
                        >
                          {note.text}
                        </span>
                      ))}
                    </span>
                  </summary>
                  <div className="space-y-1 px-2 pt-0.5 pb-2.5 pl-[38px] text-[12.5px] leading-[1.5]">
                    {row.focus ? <p className="text-t1">{row.focus}</p> : null}
                    <p className="text-t2">{row.why}</p>
                    {row.href ? (
                      <a
                        href={row.href}
                        className="inline-block font-medium text-[var(--brand)] underline-offset-4 hover:underline"
                      >
                        {copy.openSource}
                      </a>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
