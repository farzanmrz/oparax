"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Newspaper } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { githubRelease, heroArrivals, heroStory } from "../data/landing";
import { items, PREVIEW_NOTE, type ItemView } from "../data/feed";
import { StoryCard } from "../story-card";

// Round 1 change 1: one product scene. The story card is dominant; three real reports arrive one after
// another as realistic small previews and tuck behind it, each adding its mark to "Used N sources".
// No column labels, clock times, agent node or wires. Settles in about 3.8 s; reduced motion and
// ?settled=1 render the end state directly, so screenshots do not depend on timing.
// Round 2 item R2-1: once read, a preview tucks fully behind the card and leaves only a sliver (its mark),
// so no preview line is ever shown cut by the card. The settled scene then recenters on card plus slivers.

/** Show and tuck times per report, in publication order (blog, release, post). */
const EVENTS = [250, 900, 1450, 2100, 2650, 3300];
const PREVIEW_W = 340;
const CARD_X = 360;
const SLIVER = 40;
const TUCK_X = CARD_X - SLIVER;
const SETTLE_SHIFT = TUCK_X / 2;
const SLOT_Y = [16, 146, 276];
/** Tucked slivers stack inside the card's height so no preview shows below it. */
const TUCK_Y = [16, 110, 204];

const day = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));

function GitHubMark() {
  return (
    <>
      <img src="/roadmap-brands/github.svg" alt="" className="size-3.5 dark:hidden" />
      <img src="/roadmap-brands/github-white.svg" alt="" className="hidden size-3.5 dark:block" />
    </>
  );
}

const shell = "h-[112px] rounded-xl border border-border bg-card p-3.5 text-[13px] leading-snug";

function PostPreview({ item }: { item: ItemView }) {
  const [first, second] = item.text.split("\n\n");
  return (
    <div className={cn(shell, "flex gap-2.5")}>
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background"
        aria-hidden="true"
      >
        {item.publisher[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5">
          <span className="font-semibold">{item.publisher}</span>
          <span className="text-muted-foreground">
            {item.author} · {day(item.published_at)}
          </span>
          <XLogo className="ml-auto size-3" />
        </p>
        <p className="mt-1 truncate">{first}</p>
        <p className="mt-1 truncate">{second}</p>
      </div>
    </div>
  );
}

function ArticlePreview({ item }: { item: ItemView }) {
  return (
    <div className={shell}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Newspaper className="size-3.5" aria-hidden="true" />
        {new URL(item.url).hostname} · {day(item.published_at)}
      </p>
      <p className="mt-1.5 text-sm font-semibold">{item.title}</p>
      <p className="mt-0.5 line-clamp-2 text-muted-foreground">{item.text}</p>
    </div>
  );
}

function ReleasePreview({ item }: { item: ItemView }) {
  return (
    <div className={shell}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <GitHubMark />
        <span className="font-medium text-foreground">{item.author}</span>
        Release · {day(item.published_at)}
      </p>
      <p className="mt-1.5">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">{item.title}</span>
      </p>
      <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
        {item.text.split("\n").map((line) => (
          <li key={line} className="truncate">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Preview({ item }: { item: ItemView }) {
  if (item.id === githubRelease.id) return <ReleasePreview item={item} />;
  if (item.id === items.nextPost.id) return <PostPreview item={item} />;
  return <ArticlePreview item={item} />;
}

export function Hero({ settled = false }: { settled?: boolean }) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(settled ? EVENTS.length : 0);
  useEffect(() => {
    if (settled) return;
    if (reduced) {
      setStage(EVENTS.length);
      return;
    }
    const timers = EVENTS.map((ms, i) => window.setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(window.clearTimeout);
  }, [reduced, settled]);
  const tucked = (i: number) => stage > i * 2 + 1;
  const revealed = heroArrivals.filter((_, i) => tucked(i)).map((item) => item.id);
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-[90%] max-w-[1800px] pt-20 pb-16">
        <h1 className="mx-auto max-w-5xl text-center text-5xl leading-[1.08] font-semibold tracking-tight text-balance">
          Oparax watches the web and X around your beat, and brings each new story to your feed instantly.
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-relaxed text-pretty text-muted-foreground">
          Write one sentence about what you follow. Your agent decides what to watch: follow OpenAI and it also reads
          OpenAI&apos;s news feed and TechCrunch&apos;s AI coverage. Reports about the same event become one story, with
          the quote behind every line.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button asChild className="h-11 px-6 text-sm">
            <Link href="/next/signup">Sign Up</Link>
          </Button>
          <span className="text-sm text-muted-foreground">Free for a week once your agent is ready.</span>
        </div>

        <figure className="mx-auto mt-16 w-[960px]">
          <div
            className="relative min-h-[420px] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ transform: stage === EVENTS.length ? `translateX(-${SETTLE_SHIFT}px)` : undefined }}
          >
            {heroArrivals.map((item, i) => {
              const shown = stage > i * 2;
              return (
                <div
                  key={item.id}
                  className="absolute left-0 z-10 origin-left transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                  style={{
                    top: SLOT_Y[i],
                    width: PREVIEW_W,
                    opacity: shown ? 1 : 0,
                    transform: tucked(i)
                      ? `translate(${TUCK_X}px, ${TUCK_Y[i] - SLOT_Y[i]}px) scale(0.96)`
                      : shown
                        ? "translateX(0)"
                        : "translateX(-16px)",
                  }}
                >
                  <Preview item={item} />
                </div>
              );
            })}
            <div
              className={cn(
                "relative z-20 transition-opacity duration-500",
                revealed.length ? "opacity-100" : "opacity-0",
              )}
              style={{ marginLeft: CARD_X }}
            >
              {revealed.length ? <StoryCard story={heroStory} revealed={revealed} compact /> : null}
            </div>
          </div>
          <figcaption className="mt-6 flex items-baseline justify-center gap-4">
            <span className="text-sm">Three reports, one story. Open any citation to see its quote.</span>
            <span className="text-xs text-muted-foreground">{PREVIEW_NOTE}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
