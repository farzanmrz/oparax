"use client";

import { Globe, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { DigestEntry, FeedStory, ItemView } from "@/next/data/feed";
import { accounts, digests, hostOf, newest, sites, storiesFor, when, type View } from "@/next/council/data";
import { Dot, GitHubMark, KindChip, ReportMark, SiteIcon, XAvatar } from "@/next/council/marks";

// Shared atoms for the three opus-feed directions. Everything comes from the council data (next/council/data.ts):
// the recorded run's chosen RSS feeds, website and X accounts, the verified stories, and the verified GitHub
// release. Owner, October 2: every source kind is weighed as the same input, websites and RSS feeds are named
// separately, and GitHub is a source like any other. So the one recorded GitHub release (vercel/next.js v15.0.0,
// released 2024-10-21 18:51 UTC) is shown as a source of the Next.js 15 story, which its post and blog post
// formed within the same hours. That placement is a preview staging; the story's facts and citations are unchanged.

export type SourceKind = "x" | "rss" | "website" | "github";

export type Source = {
  key: string;
  kind: SourceKind;
  name: string;
  /** handle, host or repository description */
  detail: string;
  focus: string;
  host?: string;
  handle?: string;
};

export const release: DigestEntry = digests[0];
const [repoName, repoTag] = release.name.split(" ");
export const repo = { name: repoName, tag: repoTag, owner: repoName.split("/")[0] };

export const sources: Source[] = [
  ...accounts.map((a) => ({ key: a.id, kind: "x" as const, name: a.name, detail: a.handle, focus: a.why, handle: a.handle })),
  ...sites
    .filter((s) => s.kind === "rss")
    .map((s) => ({ key: s.id, kind: "rss" as const, name: s.name, detail: s.host, focus: s.focus, host: s.host })),
  ...sites
    .filter((s) => s.kind === "website")
    .map((s) => ({ key: s.id, kind: "website" as const, name: s.name, detail: s.host, focus: s.focus, host: s.host })),
  { key: "github-next", kind: "github", name: repo.name, detail: release.description, focus: release.description },
];

export const GROUPS: { kind: SourceKind; label: string; short: string }[] = [
  { kind: "x", label: "X accounts", short: "X" },
  { kind: "rss", label: "RSS feeds", short: "RSS" },
  { kind: "website", label: "Websites", short: "Web" },
  { kind: "github", label: "GitHub", short: "Git" },
];

export const groupOf = (kind: SourceKind) => sources.filter((s) => s.kind === kind);

/** "9 RSS feeds, 1 website, 7 X accounts and 1 GitHub repository", from the configured sources. */
export const sourceTotal = sources.length;

export function watchingLine() {
  const n = (k: SourceKind) => groupOf(k).length;
  const plural = (c: number, one: string, many: string) => `${c} ${c === 1 ? one : many}`;
  return `${plural(n("rss"), "RSS feed", "RSS feeds")}, ${plural(n("website"), "website", "websites")}, ${plural(n("x"), "X account", "X accounts")} and ${plural(n("github"), "GitHub repository", "GitHub repositories")}`;
}

export type Story = FeedStory & { release?: DigestEntry };

export function feed(view: View): Story[] {
  return storiesFor(view).map((s) => (s.id === "st-next-15" ? { ...s, release } : s));
}

export function sourceCount(story: Story) {
  return story.items.length + (story.release ? 1 : 0);
}

/** Does this story carry an item from this source? */
export function storyHas(story: Story, key: string) {
  const src = sources.find((s) => s.key === key);
  if (!src) return false;
  if (src.kind === "github") return Boolean(story.release);
  if (src.kind === "x") return story.items.some((i) => i.author?.toLowerCase() === src.handle?.toLowerCase());
  return story.items.some((i) => i.source_id === src.key);
}

export function filterStories(list: Story[], key: string | null) {
  return key ? list.filter((s) => storyHas(s, key)) : list;
}

/** Lead story: the newest story joined from more than one source, otherwise the newest. */
export function pickLead(list: Story[]) {
  return list.find((s) => sourceCount(s) > 1 && s.card.image) ?? list[0];
}

export function SourceGlyph({ source, size = 16, className }: { source: Source; size?: number; className?: string }) {
  if (source.kind === "x" && source.handle) return <XAvatar handle={source.handle} size={size} className={className} />;
  if (source.kind === "github")
    return (
      <span
        className={cn("grid shrink-0 place-items-center rounded-[4px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]", className)}
        style={{ width: size, height: size }}
      >
        <GitHubMark className="size-[75%]" />
      </span>
    );
  return <SiteIcon host={source.host ?? ""} size={size} className={className} />;
}

export function KindIcon({ kind, className }: { kind: SourceKind; className?: string }) {
  if (kind === "x") return <XLogo className={cn("size-3", className)} />;
  if (kind === "rss") return <Rss className={cn("size-3.5", className)} strokeWidth={2} />;
  if (kind === "website") return <Globe className={cn("size-3.5", className)} strokeWidth={1.9} />;
  return <GitHubMark className={cn("size-3.5", className)} />;
}

/** Kind chips for a story: posts blue, articles teal, a GitHub release in GitHub's own mark. */
export function StoryChips({ story, className }: { story: Story; className?: string }) {
  const kinds = [...new Set(story.items.map((i) => i.kind))];
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {kinds.map((k) => (
        <KindChip key={k} kind={k} count={story.items.filter((i) => i.kind === k).length} />
      ))}
      {story.release ? <ReleaseChip /> : null}
    </span>
  );
}

export function ReleaseChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--kind-github-soft)] px-2 text-[11.5px] font-medium text-[var(--kind-github)]",
        className,
      )}
    >
      <GitHubMark className="size-3" /> 1 Release
    </span>
  );
}

/** The cover of a story or item: its own image when it has one; otherwise its publisher's mark on the well,
 * the same size, so a story without an image sits evenly beside one with an image. */
export function Cover({
  image,
  item,
  className,
  markSize = 40,
  fade = false,
}: {
  image: string | null;
  item?: ItemView;
  className?: string;
  markSize?: number;
  fade?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-[var(--well)]", className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : item ? (
        <div className="absolute inset-0 grid place-items-center" style={{ backgroundImage: "var(--dot-grid)", backgroundSize: "14px 14px" }}>
          <span className="flex flex-col items-center gap-2">
            <span className="rounded-[10px] bg-[var(--window)] p-2" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
              <ReportMark item={item} size={markSize} className={item.kind === "post" ? "" : "rounded-md"} />
            </span>
            {markSize >= 24 ? (
              <span className="text-[11.5px] font-medium text-t3">{item.kind === "post" ? item.author : hostOf(item.url)}</span>
            ) : null}
          </span>
        </div>
      ) : null}
      {fade ? <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--window)] from-6% via-[var(--window)]/75 via-32% to-transparent to-68%" /> : null}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--line)]" />
    </div>
  );
}

/** A story's GitHub source as a row: what the repository is, and the release that joined the story. */
export function ReleaseRow({ entry, className }: { entry: DigestEntry; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-line bg-[var(--raised)] px-3 py-2.5", className)} style={{ boxShadow: "var(--top-light)" }}>
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
        <GitHubMark className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[13px]">
          <span className="font-medium text-t1">{repo.name}</span>
          <span className="truncate text-t3">{entry.description}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-t3">
          Release {repo.tag}, not a prerelease; its notes are the merged pull requests.
        </span>
      </span>
      <span className="shrink-0 text-[11.5px] tabular-nums text-t4">{when(entry.released_at)}</span>
    </div>
  );
}

export function FailedLine({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-[13px] text-t2", className)}>
      <Dot tone="error" />
      <span>
        Could not process <span className="font-medium text-[var(--error)] tabular-nums">{count}</span> item
      </span>
    </span>
  );
}

export function LiveLine({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2 text-[13px]", className)}>
      <Dot tone="ok" pulse />
      <span className="font-medium text-[var(--ok)]">Live</span>
    </span>
  );
}

export { newest, when, hostOf };
