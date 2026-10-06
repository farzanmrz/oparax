import { GitHubTile, GroupGlyph, SiteIcon, XAvatar } from "@/components/one/marks";
import { lift } from "@/components/one/stage";
import seedTable from "@/docs/source-table-seed.json";
import { monitorContent } from "@/lib/monitor/content";
import { cn } from "@/lib/utils";

// The shared source table every run starts from (docs/source-table-seed.json), one lifted panel grouped by kind under
// plain 13px labels, one line per row: the logo, the name, the handle or address. A kind with no rows is not drawn.
// Server only, so the table's descriptions never reach the browser.

const copy = monitorContent.onboarding;
const kinds = [
  { kind: "x_account", label: copy.groups.x },
  { kind: "rss", label: copy.groups.rss },
  { kind: "website", label: copy.groups.website },
  { kind: "github", label: copy.groups.github },
] as const;
const addressOf = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const hostOf = (url: string) => addressOf(url).split(/[/?#]/)[0];

export function SourceTable() {
  const rows: { id: string; kind: string; name: string; target: string }[] = seedTable;
  return (
    <div className={cn(lift, "divide-y divide-line")}>
      <p className="px-5 py-3.5 text-[13px] text-t3">{copy.tableIntro}</p>
      {kinds.map(({ kind, label }) => {
        const group = rows.filter((row) => row.kind === kind);
        if (!group.length) return null;
        return (
          <section key={kind} aria-label={label} className="px-3 pt-3.5 pb-3">
            <h2 className="flex items-center gap-2 px-2 text-[13px] font-semibold text-t1">
              <span className="grid size-[18px] place-items-center text-t3">
                <GroupGlyph kind={kind} className="size-3.5" />
              </span>
              {label}
            </h2>
            <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-x-2">
              {group.map((row) => {
                const x = kind === "x_account";
                const address = x
                  ? `@${row.target.replace(/\/+$/, "").split("/").pop()}`
                  : addressOf(row.target);
                return (
                  <li
                    key={row.id}
                    className="flex h-8 min-w-0 items-center gap-2.5 rounded-md px-2"
                  >
                    {x ? (
                      <XAvatar handle={address} size={18} />
                    ) : kind === "github" ? (
                      <GitHubTile size={18} />
                    ) : (
                      <SiteIcon host={hostOf(row.target)} size={18} className="rounded-[5px]" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      <span className="font-medium text-t1">{row.name}</span>
                      <span className="ml-1.5 text-[12px] text-t3">{address}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
