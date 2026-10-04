// Adapted from React Bits Pro notifications-1 (https://pro.reactbits.dev/docs/app-ui/notifications/notifications-1).
// Kept: the bordered panel, day-grouped sections and the rounded hover rows with their accent focus outline.
// Changes: All/Unread/Mentions tabs, unread count, mark-all-read, read toggles and dismiss removed; actor/action
// rows replaced by stories (title and first fact, disclosure to all facts and sources once) and direct items
// (source identity, facts, original link); Today/Yesterday/Earlier replaced by real report dates shown once in
// a left rail; photo thumbnails added; small neutral-500 text swapped for muted-foreground; panel height follows
// the content instead of an inner scroll area so the feed reads like a page.
"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { FeedHeading } from "../shared/feed-heading";
import { SourceIcon, sourceHost } from "../shared/brand";
import { frame } from "../shared/shell";
import { directItems, evidence, feed, stories, type DirectItem, type Story } from "../content";
import type { FeedMode } from "../types";
import { feedCopy } from "./content";

const focus =
  "focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-[var(--rb-accent)]";
const rowShell =
  "relative rounded-[var(--rb-r-lg)] border p-3.5 transition-[background-color,border-color] duration-150 ease-out desk:p-4";

function groupByDate<T extends { date: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const groups: { date: string; items: T[] }[] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last?.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}

function Bullet() {
  return <span aria-hidden="true" className="mt-[8px] size-1.5 shrink-0 rounded-full bg-[var(--rb-accent)]" />;
}

function Thumb({ src, className }: { src?: string; className?: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className={cn("h-14 w-20 shrink-0 rounded-[var(--rb-r-md)] object-cover desk:h-[72px] desk:w-28", className)}
    />
  );
}

function StoryRow({ story, defaultOpen }: { story: Story; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [first, ...rest] = story.facts;
  const addedFact = story.id === "europa" ? evidence.story.addedFact : null;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          rowShell,
          open
            ? "border-border bg-secondary/45"
            : "border-transparent hover:border-border hover:bg-secondary/40",
        )}
      >
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug tracking-tight text-balance desk:text-[17px]">
              <CollapsiblePrimitive.Trigger
                className={cn("block w-full text-left after:absolute after:inset-0 after:rounded-[var(--rb-r-lg)]", focus)}
              >
                <Thumb src={story.image} className="float-right mb-1 ml-3 h-14 w-20 desk:hidden" />
                {story.title}
              </CollapsiblePrimitive.Trigger>
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed">
              <li className="flex gap-2.5">
                <Bullet />
                <span>{first}</span>
              </li>
            </ul>
            <CollapsibleContent className="relative z-10 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
              {rest.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-1.5 text-sm leading-relaxed">
                  {rest.map((fact) => (
                    <li key={fact} className="flex gap-2.5">
                      <Bullet />
                      <span>
                        {fact}
                        {fact === addedFact && (
                          <span className="ml-2 inline-block rounded-[var(--rb-r-sm)] bg-accent px-1.5 py-px text-xs font-medium text-accent-foreground">
                            {feed.addedFromUpdate}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground">{feedCopy.sources}</h4>
                <ul className="mt-2 flex flex-col gap-1">
                  {story.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex min-h-9 items-center gap-2.5 rounded-[var(--rb-r-sm)] text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--rb-accent)] max-desk:min-h-11"
                      >
                        <SourceIcon source={source} />
                        <span className="shrink-0 font-semibold">{source.name}</span>
                        <span className="min-w-0 truncate text-muted-foreground group-hover:text-foreground group-hover:underline">
                          {source.title}
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground max-desk:hidden">{sourceHost(source)}</span>
                        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
                {story.image && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {feedCopy.photoCredit}: {story.imageCredit}
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </div>
          <div className="flex shrink-0 items-start gap-3">
            <Thumb src={story.image} className="max-desk:hidden" />
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-[var(--rb-r-md)] border border-border bg-card text-muted-foreground"
            >
              <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
            </span>
          </div>
        </div>
      </div>
    </Collapsible>
  );
}

function DirectRow({ item }: { item: DirectItem }) {
  return (
    <article className={cn(rowShell, "flex gap-3.5 border-transparent hover:border-border hover:bg-secondary/40")}>
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[var(--rb-r-md)] border border-border bg-card">
        <SourceIcon source={item.source} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <Thumb src={item.image} className="float-right mb-2 ml-3 h-14 w-20 desk:hidden" />
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{item.source.name}</span>
          <span aria-hidden="true">·</span>
          <span>{sourceHost(item.source)}</span>
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug tracking-tight text-balance desk:text-[17px]">
          {item.headline}
        </h3>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed">
          {item.facts.map((fact) => (
            <li key={fact} className="flex gap-2.5">
              <Bullet />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
        <a
          href={item.source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-flex min-h-8 items-center gap-1.5 rounded-[var(--rb-r-sm)] text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--rb-accent)] max-desk:min-h-11"
        >
          {feed.openOriginal}
          <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      <Thumb src={item.image} className="max-desk:hidden" />
    </article>
  );
}

function DayGroups<T extends { date: string }>({
  items,
  render,
}: {
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
}) {
  let index = 0;
  return (
    <div className="divide-y divide-border">
      {groupByDate(items).map((group) => (
        <section
          key={group.date}
          aria-label={group.date}
          className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-2 px-3 py-4 desk:grid-cols-[176px_minmax(0,1fr)] desk:px-5 desk:py-5"
        >
          <h2 className="flex items-center gap-2.5 px-1 pt-1 text-sm font-semibold text-muted-foreground desk:sticky desk:top-[76px] desk:self-start desk:pt-4">
            <span aria-hidden="true" className="size-2 rounded-full bg-[var(--rb-accent)] ring-4 ring-[color-mix(in_oklab,var(--rb-accent)_18%,transparent)]" />
            {group.date}
          </h2>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={index}>{render(item, index++)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function Feed({ mode, onMode }: { mode: FeedMode; onMode: (mode: FeedMode) => void }) {
  return (
    <div className={cn(frame, "py-8 desk:py-12")}>
      <FeedHeading mode={mode} onMode={onMode} />
      <p className="mt-3 text-sm text-muted-foreground">{mode === "clustered" ? feed.clusteredHint : feed.directHint}</p>
      <div className="rb-theme-scope mt-6 rounded-[var(--rb-r-2xl)] border border-border bg-card shadow-[0_1px_2px_rgb(9_15_29/0.05)]">
        {mode === "clustered" ? (
          <DayGroups items={stories} render={(story, index) => <StoryRow story={story} defaultOpen={index === 0} />} />
        ) : (
          <DayGroups items={directItems} render={(item) => <DirectRow item={item} />} />
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{feed.sample}</p>
    </div>
  );
}
