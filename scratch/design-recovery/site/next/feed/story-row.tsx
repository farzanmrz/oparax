"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Newspaper } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Collapsible } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { FeedStory, ItemView } from "../data/feed";

// Palette-comparison card (adapted from next/story-card.tsx, which stays as the round 2 card for
// ?compose=old and the landing hero). Same anatomy and the same controlled AI Elements Sources: headline,
// facts with a parenthesized citation that opens that fact's quotes. Changes, each tied to a mechanism in
// focus-review/theme-research/what-the-owner-sees.md: time and report count in the dim tier beside the
// headline (6), facts in the reading grey with the key phrase brightened (3), the citation in the dim tier
// (3.6.5), real publisher favicons and X avatars in native color with kind told by shape (5), quotes in a
// sunk well (3.1 L2). Sources appear once, in the strip under the facts.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fixed UTC formatting so the server and client render the same string.
function when(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hh}:${mm}`;
}

const domain = (item: ItemView) => new URL(item.url).hostname.replace(/^www\./, "");

// Preview stand-in for a writer-marked key phrase: numbers, dates and the named release, brightened in place.
const KEY =
  /(\d+(?:\.\d+)?% to \d+(?:\.\d+)?%|\d+(?:\.\d+)?%|\b\d+-\d+\b|\b\d+ members\b|(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}|React 19|Next\.js 15|fifth cut|no longer cached by default)/g;

function keyed(text: string) {
  return text.split(KEY).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-t2">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * Runtime public image for the preview only (unavatar for X, DuckDuckGo favicons for sites); nothing is
 * downloaded into the repo. A failed load shows the generic glyph. The ref check catches an error that
 * fired before hydration, which React's onError would miss.
 */
function RemoteMark({ item, size = 17 }: { item: ItemView; size?: number }) {
  const post = item.kind === "post";
  const src = post
    ? `https://unavatar.io/x/${item.author!.replace("@", "")}`
    : `https://icons.duckduckgo.com/ip3/${domain(item)}.ico`;
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  const shape = post ? "rounded-full" : "rounded-[4px]";
  if (failed)
    return (
      <span
        className={cn("grid shrink-0 place-items-center bg-raised text-t3", shape)}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {post ? <XLogo className="size-2.5" /> : <Newspaper className="size-2.5" />}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("shrink-0 object-cover shadow-[0_0_0_1px_var(--line)]", shape)}
      style={{ width: size, height: size }}
    />
  );
}

/** One source in the strip: mark, publisher in the name tier, handle or domain in the dim tier. */
function SourceLabel({ item }: { item: ItemView }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <RemoteMark item={item} />
      <span className="truncate font-[560] text-t2">{item.publisher}</span>
      <span className="truncate text-t4">{item.kind === "post" ? item.author : domain(item)}</span>
    </span>
  );
}

export function StoryRow({
  story,
  highlighted = false,
  openSources = false,
}: {
  story: FeedStory;
  highlighted?: boolean;
  openSources?: boolean;
}) {
  const [open, setOpen] = useState(openSources);
  const [active, setActive] = useState<number | null>(null);
  const items = story.items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const newest = items.reduce((a, b) => (a.published_at > b.published_at ? a : b));

  const cite = (index: number) => {
    const next = active === index && open ? null : index;
    setActive(next);
    setOpen(next !== null ? true : open);
  };

  return (
    <article aria-current={highlighted ? "true" : undefined} className="story px-[22px] pt-[18px] pb-4">
      <header className="flex items-baseline gap-6">
        <h3
          className="min-w-0 flex-1 text-[17px] leading-snug tracking-[-0.012em] text-balance text-t1"
          style={{ fontWeight: "var(--heading-weight)" }}
        >
          {story.card.headline}
        </h3>
        <p className="shrink-0 text-xs text-t4 tabular-nums">
          {items.length > 1 ? `${items.length} reports · ` : null}
          {when(newest.published_at)}
        </p>
      </header>

      <ul className="mt-2.5 space-y-1.5">
        {story.card.facts.map((fact, index) => {
          const names = [...new Set(fact.evidence.map((e) => byId.get(e.item)!.publisher))];
          const on = active === index && open;
          return (
            <li key={index} className="flex gap-2.5 text-sm leading-[1.55] text-t3">
              <span className="mt-[0.68em] size-1 shrink-0 rounded-full bg-t4" aria-hidden="true" />
              <p>
                {keyed(fact.text)}{" "}
                <button
                  type="button"
                  onClick={() => cite(index)}
                  aria-expanded={on}
                  aria-label={`Show the quote${fact.evidence.length > 1 ? "s" : ""} from ${names.join(" and ")}`}
                  className={cn(
                    "rounded-sm px-0.5 text-[12.5px] whitespace-nowrap text-t4 transition-colors hover:text-t2 focus-visible:outline-2 focus-visible:outline-ring",
                    on && "bg-foreground/[0.07] text-t2",
                  )}
                >
                  ({names.join(", ")})
                </button>
              </p>
            </li>
          );
        })}
      </ul>

      {/* AI Elements types the Sources root as a div, so the stock Collapsible is the controlled root here. */}
      <Collapsible
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setActive(null);
        }}
        className="not-prose mt-3 text-[12.5px]"
      >
        <SourcesTrigger
          count={items.length}
          aria-label={`Show the quotes from ${items.length} ${items.length === 1 ? "source" : "sources"}`}
          className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm"
        >
          {items.map((item) => (
            <SourceLabel key={item.id} item={item} />
          ))}
          <ChevronDown
            className="size-3.5 text-t4 transition-transform group-hover:text-t2 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </SourcesTrigger>
        <SourcesContent className="mt-3 w-full gap-3 rounded-lg border border-line bg-well p-3.5">
          {items.map((item) => {
            const quotes = story.card.facts.flatMap((fact, index) =>
              fact.evidence.filter((e) => e.item === item.id).map((e) => ({ index, span: e.span })),
            );
            const relevant = active === null || quotes.some((q) => q.index === active);
            return (
              <div key={item.id} className={cn("transition-opacity", !relevant && "opacity-45")}>
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex hover:opacity-80">
                  <SourceLabel item={item} />
                </a>
                <ul className="mt-1.5 ml-[7px] space-y-1 border-l border-line pl-4">
                  {quotes.map((q, i) => (
                    <li
                      key={i}
                      className={cn(
                        "rounded-sm px-2 py-1 text-[13px] leading-snug transition-colors",
                        active === q.index ? "bg-foreground/[0.07] text-t2" : "text-t3",
                      )}
                    >
                      &ldquo;{q.span}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </SourcesContent>
      </Collapsible>
    </article>
  );
}
