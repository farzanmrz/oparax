"use client";

import { useState } from "react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { useShow } from "./chrome";
import { newest, sourceById, when, type Item, type Kind, type Story } from "./data";
import { NewFlag } from "./live";
import { ItemMark, KindChip, KindGlyph } from "./marks";

// One story, readable on arrival: kind chips and time, the headline, every fact with its sources named, and on
// the right the story's image when it has one plus each source as a small card in the form it arrived (an
// article's quote, an Twitter post, a GitHub release). Hovering or focusing a cited name lights its card.

export function kindsOf(story: Story) {
  const out: { kind: Kind; count: number }[] = [];
  for (const k of ["article", "post", "github"] as Kind[]) {
    const n = story.items.filter((i) => i.kind === k).length;
    if (n) out.push({ kind: k, count: n });
  }
  return out;
}

export function Publisher({ item }: { item: Item }) {
  const { show } = useShow();
  const src = sourceById.get(item.sourceId);
  if (!src) return <>{item.publisher}</>;
  return <>{show === "name" ? src.name : src.handle}</>;
}

export function StoryHead({ story, fresh = false, size = "md" }: { story: Story; fresh?: boolean; size?: "md" | "lg" }) {
  const multi = story.items.length > 1;
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {kindsOf(story).map(({ kind, count }) => (
          <KindChip key={kind} kind={kind} count={multi ? count : undefined} />
        ))}
        <span className="inline-flex h-[22px] items-center px-1 text-[12px] tabular-nums text-t3">{when(newest(story).published_at)} UTC</span>
        {fresh ? <NewFlag className="ml-1" /> : null}
      </div>
      <h2
        className={cn(
          "mt-3 font-semibold text-t1",
          size === "lg" ? "text-[25px] leading-[1.25] tracking-[-0.02em]" : "text-[21px] leading-[1.3] tracking-[-0.016em]",
        )}
      >
        {story.headline}
      </h2>
    </>
  );
}

export function Facts({
  story,
  onFocus,
  max,
  className,
  size = "md",
}: {
  story: Story;
  onFocus?: (id: string | null) => void;
  max?: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const byId = new Map(story.items.map((i) => [i.id, i]));
  const facts = max ? story.facts.slice(0, max) : story.facts;
  return (
    <ul className={cn(size === "sm" ? "space-y-2" : "space-y-2.5", className)}>
      {facts.map((fact, fi) => {
        const cited = [...new Set(fact.evidence.map((e) => e.item))].map((id) => byId.get(id)!);
        return (
          <li key={fi} className={cn("flex gap-2.5", size === "sm" ? "text-[13px] leading-[1.5]" : "text-[14px] leading-[1.55]")}>
            <span aria-hidden="true" className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t3" />
            <p className="min-w-0 text-t2">
              {fact.text}{" "}
              <span className="text-t3">
                {cited.map((item, ci) => (
                  <span key={item.id} className="whitespace-nowrap">
                    {ci === 0 ? "(" : ", "}
                    <button
                      type="button"
                      onMouseEnter={() => onFocus?.(item.id)}
                      onMouseLeave={() => onFocus?.(null)}
                      onFocus={() => onFocus?.(item.id)}
                      onBlur={() => onFocus?.(null)}
                      className="underline-offset-[3px] transition-colors hover:text-t1 hover:underline focus-visible:text-t1 focus-visible:underline focus-visible:outline-none"
                    >
                      <Publisher item={item} />
                    </button>
                    {ci === cited.length - 1 ? ")" : ""}
                  </span>
                ))}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function StoryImage({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("aspect-[16/9] w-full rounded-lg border border-line object-cover", className)}
      style={{ boxShadow: "var(--card-shadow)" }}
    />
  );
}

export function sortedItems(story: Story) {
  return [...story.items].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
}

/** The full story as the feed shows it: text on the left, image and source cards on the right. */
export function StoryBlock({ story, fresh = false, last = false }: { story: Story; fresh?: boolean; last?: boolean }) {
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <article className={cn("grid gap-5 px-8 py-7 @min-[700px]:grid-cols-[minmax(0,1fr)_284px] @min-[700px]:gap-8", !last && "border-b border-line")}>
      <div className="min-w-0">
        <StoryHead story={story} fresh={fresh} />
        <Facts story={story} onFocus={setFocus} className="mt-4" />
      </div>
      <div className="grid min-w-0 grid-cols-2 items-start gap-2.5 @min-[700px]:block @min-[700px]:space-y-2.5">
        {story.image ? <StoryImage src={story.image} /> : null}
        {sortedItems(story).map((item) => (
          <SourceCard key={item.id} item={item} story={story} focused={focus === item.id} />
        ))}
      </div>
    </article>
  );
}

/** Each source of a story as its own small card, in the form it arrived: an article quote, an Twitter post, a release. */
export function SourceCard({ item, story, focused = false, className }: { item: Item; story: Story; focused?: boolean; className?: string }) {
  const src = sourceById.get(item.sourceId)!;
  const spans = [...new Set(story.facts.flatMap((f) => f.evidence.filter((e) => e.item === item.id).map((e) => e.span)))];
  const shell = cn(
    "block rounded-lg border bg-[var(--raised)] p-3 transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-ring",
    focused ? "border-[var(--brand-line)] shadow-[0_0_0_1px_var(--brand-line)]" : "border-line shadow-[var(--top-light)]",
    className,
  );
  if (item.kind === "post")
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className={shell}>
        <span className="flex items-center gap-2">
          <ItemMark item={item} size={28} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[13px] font-semibold text-t1">{src.name}</span>
            <span className="block text-[12px] text-t3">{src.handle}</span>
          </span>
          <XLogo className="size-3.5 text-t2" />
        </span>
        <span className="mt-2.5 block space-y-2 text-[13px] leading-[1.5] text-t1">
          {item.text.split("\n\n").map((p) => (
            <span key={p} className="block">
              {p.startsWith("nextjs.org") ? <span className="text-[var(--brand)]">{p}</span> : p}
            </span>
          ))}
        </span>
        <span className="mt-2.5 block text-[11.5px] tabular-nums text-t3">{when(item.published_at)} UTC</span>
      </a>
    );
  if (item.kind === "github")
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className={shell}>
        <span className="flex items-center gap-2">
          <ItemMark item={item} size={18} />
          <span className="text-[13px] font-semibold text-t1">vercel/next.js</span>
          <span className="ml-auto rounded-full border border-line-strong px-1.5 py-px font-mono text-[11px] text-t2">v15.0.0</span>
        </span>
        <span className="mt-2.5 block space-y-1.5 rounded-md border border-line bg-[var(--well)] px-2.5 py-2 font-mono text-[11.5px] leading-[1.5] text-t2">
          {item.text.split("\n").map((line) => {
            const breaking = line.startsWith("[Breaking]");
            return (
              <span key={line} className="block">
                {breaking ? <span className="text-[var(--caution)]">[Breaking]</span> : null}
                {breaking ? line.slice(10) : line}
              </span>
            );
          })}
        </span>
        <span className="mt-2.5 block text-[11.5px] tabular-nums text-t3">Released {when(item.published_at)} UTC</span>
      </a>
    );
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className={shell}>
      <span className="flex items-center gap-2">
        <ItemMark item={item} size={16} />
        <span className="min-w-0 flex-1 text-[12.5px] font-medium text-t1">
          <Publisher item={item} />
        </span>
        <KindGlyph kind="article" className="size-3.5 text-[var(--kind-article)]" />
      </span>
      <span className="mt-2 block border-l-2 border-[var(--kind-article)] pl-2.5 text-[12.5px] leading-[1.5] text-t2">
        “{(spans[0] ?? item.text).replace(/^["“]|["”]$/g, "")}”
      </span>
      <span className="mt-2 block text-[11.5px] tabular-nums text-t3">{when(item.published_at)} UTC</span>
    </a>
  );
}
