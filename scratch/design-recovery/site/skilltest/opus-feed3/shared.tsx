"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleAlert, Layers, Rows3, X as XIcon } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { THEME_KEY } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { FeedStory, ItemView } from "@/next/data/feed";
import { Facts } from "@/next/council/chrome";
import { beat as beatText, counts, HANDLE, hostOf, newest, status, when } from "@/next/council/data";
import { allSources, gh, href, itemKind, kindLabel, sourceCount, type FeedState, type Source } from "./model";
import { Checking } from "@/next/council/live";
import { Dot, GitHubMark, KindChip, KindGlyph, MarkStack, ReportMark, SiteIcon, XAvatar } from "@/next/council/marks";

// Shared parts of the opus-feed3 directions (consensus-opus round 3): the source set in the owner's four named
// groups, the source filter, the status words, and one complete story: meta line, headline, every fact, the
// picture at its own aspect ratio or, with no image, a plate of the source's own words, and its quoted evidence.
// Everything shown comes from next/data; status values are the preview fixtures, labelled once.

/** Re-applies the pre-paint theme choice after mount, in case hydration rewrote the html element. */
export function useThemeGuard() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search).get("theme");
      const stored = localStorage.getItem(THEME_KEY);
      const t = q === "light" || q === "dark" ? q : stored === "light" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {}
  }, []);
}

/* ───────────── small parts ───────────── */

export function SourceMark({ source, size = 16 }: { source: Source; size?: number }) {
  if (source.kind === "x") return <XAvatar handle={source.handle!} size={size} />;
  if (source.kind === "github")
    return (
      <span className="grid shrink-0 place-items-center rounded-[4px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]" style={{ width: size, height: size }}>
        <GitHubMark className="size-[75%]" />
      </span>
    );
  return <SiteIcon host={source.host!} size={size} />;
}

export function GroupLabel({ label, count, className }: { label: string; count: number; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] tracking-[0.12em] text-t4 uppercase", className)}>
      {label} <span className="tabular-nums">{count}</span>
    </p>
  );
}

export function Account({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2 text-[13px] text-t1", className)}>
      <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[10.5px] font-semibold text-white">F</span>
      <span className="truncate">@{HANDLE}</span>
    </span>
  );
}

export function Trial({ className }: { className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center gap-2", className)}>
      <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
        FREE WEEK
      </span>
      <span className="text-[12px] text-t3">
        <span className="tabular-nums">{status.daysLeft}</span> days left
      </span>
    </span>
  );
}

export function Brand() {
  return <OparaxMark className="size-[18px] shrink-0 text-t1" />;
}

export function Modes({ base, state, className }: { base: string; state: FeedState; className?: string }) {
  const icon = { clustered: Layers, direct: Rows3 };
  return (
    <nav aria-label="Feed view" className={cn("flex rounded-lg border border-line bg-[var(--well)] p-0.5", className)}>
      {(["clustered", "direct"] as const).map((v) => {
        const Icon = icon[v];
        const on = v === state.view;
        return (
          <Link
            key={v}
            href={href(base, state, { view: v })}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-t3 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring",
              on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
            )}
          >
            <Icon className={cn("size-3.5", on && "text-[var(--brand)]")} aria-hidden="true" />
            {v === "clustered" ? "Clustered" : "Direct"}
            {state.empty ? null : <span className="tabular-nums text-t4">{counts[v]}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AlertsAction({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span className="flex items-center gap-1.5 text-[12px] whitespace-nowrap text-t3 max-sm:hidden">
        <Dot tone="idle" /> Alerts not connected
      </span>
      <a
        href="https://x.com/oparax_ai"
        target="_blank"
        rel="noreferrer"
        title="Alerts not connected. Opens @oparax_ai on X."
        className={cn(
          "inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium whitespace-nowrap text-primary-foreground",
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)]",
          "transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <XLogo className="size-3" />
        Get alerts on X
      </a>
    </span>
  );
}

/** Live, checking and failed, each in its own hue, as words. */
export function StatusWords({ pending, className }: { pending: number; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]", className)}>
      <span className="flex items-center gap-2 whitespace-nowrap">
        <Dot tone="ok" pulse />
        <span className="font-medium text-[var(--ok)]">Live</span>
        <span className="text-t3">watching {sourceCount} sources</span>
      </span>
      <Checking pending={pending} compact />
      <span className="flex items-center gap-1.5 whitespace-nowrap text-t2">
        <CircleAlert className="size-3.5 text-[var(--error)]" aria-hidden="true" />
        <span className="tabular-nums text-[var(--error)]">{status.failed}</span> failed
      </span>
    </div>
  );
}

/** "Showing Vercel, Clear" while one source is chosen. */
export function Showing({ base, state, className }: { base: string; state: FeedState; className?: string }) {
  const src = allSources.find((s) => s.id === state.source);
  if (!src) return null;
  return (
    <div className={cn("flex items-center gap-2 text-[13px] text-t3", className)}>
      Showing
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 py-0.5 text-t1">
        <SourceMark source={src} size={14} />
        {src.name}
        <span className="text-t3">{kindLabel[src.kind]}</span>
      </span>
      <Link
        href={href(base, state, { source: null })}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[var(--brand)] hover:bg-[var(--brand-soft)] focus-visible:outline-2 focus-visible:outline-ring"
      >
        <XIcon className="size-3.5" aria-hidden="true" /> Clear
      </Link>
    </div>
  );
}

/* ───────────── one story ───────────── */

export function kindsOf(story: FeedStory) {
  return (["article", "post"] as const)
    .map((k) => ({ kind: k, n: story.items.filter((i) => i.kind === k).length }))
    .filter((k) => k.n > 0);
}

export function Meta({ story, fresh, extra }: { story: FeedStory; fresh?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {kindsOf(story).map((k) => (
        <KindChip key={k.kind} kind={k.kind} count={k.n} />
      ))}
      {story.items.length > 1 ? (
        <span className="inline-flex h-[22px] items-center gap-1 rounded-full border border-line px-2 text-[11.5px] text-t3">
          <Layers className="size-3" aria-hidden="true" /> Joined from {story.items.length} sources
        </span>
      ) : null}
      {fresh ? <NewMark /> : null}
      {extra}
      <span className="ml-auto font-mono text-[11px] tracking-wide text-t4 tabular-nums">{when(newest(story).published_at)}</span>
    </div>
  );
}

function NewMark() {
  return (
    <span className="inline-flex h-[18px] items-center rounded-full bg-[var(--brand)] px-1.5 text-[10.5px] font-semibold text-white">New</span>
  );
}

export function Headline({ story, className }: { story: FeedStory; className?: string }) {
  return <h2 className={cn("text-[22px] leading-[1.25] font-semibold tracking-[-0.02em] text-balance text-t1", className)}>{story.card.headline}</h2>;
}

export function StoryFacts({ story, large, className }: { story: FeedStory; large?: boolean; className?: string }) {
  return <Facts story={story} className={cn("[&_.text-t4]:text-t3", large && "space-y-2.5 [&>li]:text-[15.5px]", className)} />;
}

/** The item whose own words fill the plate when the story has no image: the newest item. */
function plateItem(story: FeedStory) {
  return newest(story);
}

function plateText(item: ItemView) {
  return item.kind === "post" ? item.text.replace(/\n{2,}/g, "\n") : item.title;
}

/**
 * The picture at its own aspect ratio (fit "natural"), or cropped to 16:9 (fit "frame"); with no image, a plate
 * of the source's own words on the well: mark, name, kind, and the item's title or post text in large type.
 */
export function Picture({ story, fit, className }: { story: FeedStory; fit: "natural" | "frame"; className?: string }) {
  const image = story.card.image;
  if (!image) {
    const item = plateItem(story);
    return (
      <figure
        className={cn(
          "flex flex-col justify-between gap-5 rounded-lg border border-line bg-[var(--well)] p-5",
          fit === "frame" ? "aspect-video" : "min-h-[190px]",
          className,
        )}
        style={{ boxShadow: "var(--top-light)" }}
      >
        <figcaption className="flex items-center gap-2 text-[12.5px]">
          <ReportMark item={item} size={22} />
          <span className="font-medium text-t1">{item.publisher}</span>
          <span className="text-t4">{item.kind === "post" ? item.author : hostOf(item.url)}</span>
          <span
            className={cn(
              "ml-auto inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[11px] font-medium",
              item.kind === "post" ? "bg-[var(--kind-post-soft)] text-[var(--kind-post)]" : "bg-[var(--kind-article-soft)] text-[var(--kind-article)]",
            )}
          >
            {item.kind === "post" ? <XLogo className="size-2.5" /> : null}
            {item.kind === "post" ? "Post" : "Article"}
          </span>
        </figcaption>
        <blockquote
          className={cn(
            "whitespace-pre-line text-t1",
            item.kind === "post" ? "text-[19px] leading-[1.4]" : "text-[20px] leading-[1.3] font-semibold tracking-[-0.015em]",
          )}
        >
          {plateText(item)}
        </blockquote>
      </figure>
    );
  }
  const natural = fit === "natural";
  if (natural && portrait(image))
    return (
      <div className={cn("grid h-[260px] place-items-center overflow-hidden rounded-lg border border-line bg-[var(--well)]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" loading="lazy" decoding="async" className="block h-[258px] w-auto max-w-none" />
      </div>
    );
  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-[var(--well)]", !natural && "aspect-video", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("block w-full", natural ? "h-auto" : "h-full object-cover", !natural && portrait(image) && "object-contain")}
      />
    </div>
  );
}

/** The one stored portrait image (the Bank of England post card, 960x1200) is shown whole, never cropped, and its
 * height is capped so it does not stretch a band past its facts. */
function portrait(src: string) {
  return src.includes("pbs.twimg.com");
}

/** Quoted evidence per contributing item, newest first; a passage already shown on the plate is not repeated. */
export function Evidence({ story, max = 3, row = false, className }: { story: FeedStory; max?: number; row?: boolean; className?: string }) {
  const onPlate = story.card.image ? null : plateItem(story);
  const blocks = [...story.items]
    .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
    .map((item) => {
      const spans = [...new Set(story.card.facts.flatMap((f) => f.evidence.filter((e) => e.item === item.id).map((e) => e.span)))];
      const shown = onPlate && onPlate.id === item.id ? spans.filter((s) => !plateText(item).includes(s.replace(/^["“]|["”]$/g, ""))) : spans;
      return { item, spans: shown.slice(0, max) };
    })
    .filter((b) => b.spans.length > 0);
  if (blocks.length === 0) return null;
  return (
    <div className={className}>
      <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4 uppercase">In their words</p>
      <div className={cn("mt-2", row && blocks.length > 1 ? "grid gap-2 sm:grid-cols-2 sm:items-start" : "space-y-2")}>
        {blocks.map((b) => (
          <QuoteCard key={b.item.id} item={b.item} spans={b.spans} />
        ))}
      </div>
    </div>
  );
}

function QuoteCard({ item, spans }: { item: ItemView; spans: string[] }) {
  return (
    <figure
      className={cn(
        "rounded-md border border-line bg-[var(--well)] px-3 py-2.5 text-[13px] leading-[1.5]",
        item.kind === "post" ? "border-l-2 border-l-[var(--kind-post)]" : "border-l-2 border-l-[var(--kind-article)]",
      )}
    >
      <figcaption className="mb-1.5 flex items-center gap-1.5 text-[11.5px] text-t3">
        <ReportMark item={item} size={13} />
        {item.publisher}
        <KindGlyph kind={item.kind} className="ml-0.5 size-3 text-t4" />
      </figcaption>
      <div className="space-y-1.5">
        {spans.map((s) => (
          <blockquote key={s} className="text-t2">
            “{s.replace(/^["“]|["”]$/g, "")}”
          </blockquote>
        ))}
      </div>
    </figure>
  );
}

/** Publisher marks and names for the meta line. */
export function Publishers({ story }: { story: FeedStory }) {
  return (
    <span className="ml-1 flex min-w-0 items-center gap-2 text-[12px] text-t3">
      <MarkStack items={story.items} size={16} />
      <span className="truncate">{[...new Set(story.items.map((i) => i.publisher))].join(", ")}</span>
    </span>
  );
}

/** The contributing items, each a link to the original, with its kind. */
export function Contributors({ story, className }: { story: FeedStory; className?: string }) {
  return (
    <ul className={cn("space-y-1", className)}>
      {[...story.items]
        .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
        .map((item) => (
          <li key={item.id}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[var(--raised)] focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ReportMark item={item} size={16} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-t1">{item.publisher}</span>
                <span className="block truncate text-[11.5px] text-t4">{itemKind(item)}</span>
              </span>
              <span className="shrink-0 font-mono text-[10.5px] text-t4 tabular-nums">{when(item.published_at, false)}</span>
            </a>
          </li>
        ))}
    </ul>
  );
}

/* ───────────── empty states ───────────── */

export function SourceTile({ source }: { source: Source }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-[var(--well)] p-3.5" style={{ boxShadow: "var(--top-light)" }}>
      <div className="flex items-center gap-2">
        <SourceMark source={source} size={18} />
        <span className="min-w-0 truncate text-[13px] font-medium text-t1">{source.name}</span>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-medium",
            source.kind === "x" && "bg-[var(--kind-post-soft)] text-[var(--kind-post)]",
            (source.kind === "rss" || source.kind === "website") && "bg-[var(--kind-article-soft)] text-[var(--kind-article)]",
            source.kind === "github" && "bg-[var(--kind-github-soft)] text-[var(--kind-github)]",
          )}
        >
          {kindLabel[source.kind]}
        </span>
      </div>
      <p className="text-[11.5px] text-t4">{source.kind === "x" ? source.handle : source.sub}</p>
      {source.focus ? <p className="text-[12.5px] text-t3">{source.focus}</p> : null}
      {source.why ? <p className="text-[12.5px] leading-[1.5] text-t2">{source.why}</p> : null}
      {source.kind === "github" ? (
        <p className="text-[12px] text-t3">
          Latest release <span className="font-mono text-t2">v15.0.0</span>, {when(gh.released_at, false)}
        </p>
      ) : null}
    </div>
  );
}

/** No stories yet: the beat, then every configured source with why it was chosen. */
export function EmptyFeed({ cols = 3, className }: { cols?: 3 | 4; className?: string }) {
  return (
    <div className={className}>
      <p className="font-mono text-[10.5px] tracking-[0.12em] text-t4 uppercase">Your beat</p>
      <p className="mt-2 max-w-[760px] text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-balance text-t1">
        “{beatText}”
      </p>
      <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-t3">
        No stories yet. Each new item from these {sourceCount} sources is checked against your sentence, and stories appear here as they pass.
      </p>
      <div className={cn("mt-6 grid gap-3", cols === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
        {allSources.map((s) => (
          <SourceTile key={s.id} source={s} />
        ))}
      </div>
    </div>
  );
}

/** A chosen source with nothing in the feed: name it, offer Clear, show its tile. */
export function EmptySource({ base, state, className }: { base: string; state: FeedState; className?: string }) {
  const src = allSources.find((s) => s.id === state.source)!;
  return (
    <div className={cn("grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start", className)}>
      <div>
        <p className="text-[22px] leading-[1.3] font-semibold tracking-[-0.02em] text-t1">Nothing from {src.name} in your feed yet</p>
        <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-t3">
          {src.kind === "github"
            ? "This repository is watched like any other source. Its recorded release is shown here; it has not joined a story on your beat."
            : "This source is watched like the others. When it publishes something on your beat, the story appears here."}
        </p>
        <Link
          href={href(base, state, { source: null })}
          className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong px-3 text-[13px] text-t1 hover:bg-[var(--raised)] focus-visible:outline-2 focus-visible:outline-ring"
        >
          <XIcon className="size-3.5" aria-hidden="true" /> Clear, show all sources
        </Link>
      </div>
      <SourceTile source={src} />
    </div>
  );
}

