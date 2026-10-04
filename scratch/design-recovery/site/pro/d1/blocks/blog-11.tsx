// Adapted from React Bits Pro blog-11 (https://pro.reactbits.dev/docs/blocks/blog). Changes: the featured 16/10 essay was removed so every story gets the same row (photo and no-photo stories read in the same order with the same completeness); rows keep blog-11's hairline dividers and nudging arrow but carry title, facts and sources instead of tag, read time and author; dates moved out of the rows into one sticky rail label per date group; photos became a supporting thumbnail beside the facts; placeholder images, "Browse the journal", the uppercase "More this month" eyebrow and the in-view stagger were removed; colors use semantic tokens and lg breakpoints follow the shared frame.
"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceIcon, sourceHost } from "../../shared/brand";
import { evidence, feed, type DirectItem, type Source, type Story } from "../../content";
import { feedCopy } from "../content";
import { FactList, SourceLink } from "../story";

export type FeedRow = {
  id: string;
  date: string;
  title: string;
  facts: string[];
  sources: Source[];
  image?: string;
  imageAlt?: string;
  credit?: string;
  direct?: boolean;
};

export const storyRow = (story: Story): FeedRow => ({
  id: story.id,
  date: story.date,
  title: story.title,
  facts: story.facts,
  sources: story.sources,
  image: story.image,
  imageAlt: story.image === evidence.article.image ? evidence.article.imageAlt : undefined,
  credit: story.imageCredit,
});

export const directRow = (item: DirectItem): FeedRow => ({
  id: item.source.url,
  date: item.date,
  title: item.headline,
  facts: item.facts,
  sources: [item.source],
  image: item.image,
  imageAlt: item.imageAlt,
  credit: item.credit,
  direct: true,
});

function Photo({ row, className }: { row: FeedRow; className?: string }) {
  if (!row.image) return null;
  return (
    <figure className={cn("relative overflow-hidden rounded-lg border border-border bg-muted", className)}>
      <img src={row.image} alt={row.imageAlt ?? ""} loading="lazy" className="size-full object-cover" />
      {row.credit && (
        <figcaption className="absolute right-1.5 bottom-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {row.credit}
        </figcaption>
      )}
    </figure>
  );
}

// One source shown with its full identity: icon, name, host, then a plain link to the original.
function OriginalSource({ source }: { source: Source }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm">
        <SourceIcon source={source} className="size-5" />
        <span className="min-w-0 leading-tight">
          <span className="block font-semibold text-foreground">{source.name}</span>
          <span className="block text-xs text-muted-foreground">{sourceHost(source)}</span>
        </span>
      </p>
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="group/open inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-desk:min-h-11"
      >
        {feed.openOriginal}
        <ArrowUpRight
          className="size-4 transition-transform duration-200 ease-out group-hover/open:-translate-y-0.5 group-hover/open:translate-x-0.5"
          aria-hidden="true"
        />
      </a>
    </div>
  );
}

function Row({ row }: { row: FeedRow }) {
  return (
    <article className="grid gap-x-10 gap-y-5 py-7 desk:py-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl leading-snug font-semibold tracking-tight text-balance desk:text-[1.375rem]">
            {row.title}
          </h2>
          <FactList facts={row.facts} className="mt-3 max-w-[68ch]" />
          <Photo row={row} className="mt-4 aspect-[16/9] w-full desk:hidden" />
        </div>
        <Photo row={row} className="aspect-[4/3] w-44 shrink-0 self-start max-desk:hidden lg:w-52" />
      </div>
      <div className="border-border max-lg:border-t max-lg:pt-4 lg:border-l lg:pl-6">
        <p className="text-xs font-semibold text-muted-foreground">
          {row.direct ? feedCopy.sourceLabel : feedCopy.sourcesLabel}
        </p>
        <div className="mt-2">
          {row.direct ? (
            <OriginalSource source={row.sources[0]} />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {row.sources.map((source) => (
                <li key={source.url}>
                  <SourceLink source={source} stacked />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

export function Blog11({ rows }: { rows: FeedRow[] }) {
  const groups: { date: string; rows: FeedRow[] }[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last?.date === row.date) last.rows.push(row);
    else groups.push({ date: row.date, rows: [row] });
  }

  return (
    <div className="border-t border-border">
      {groups.map((group) => {
        const [day, year] = group.date.split(", ");
        return (
          <section
            key={group.date}
            aria-label={group.date}
            className="grid border-b border-border lg:grid-cols-[9rem_minmax(0,1fr)] lg:gap-x-8"
          >
            <div className="relative pt-7 max-lg:pb-0 desk:pt-8 lg:pl-5">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border max-lg:hidden" />
              <p className="relative lg:sticky lg:top-24">
                <span
                  aria-hidden="true"
                  className="absolute top-[0.55em] -left-5 size-2 -translate-x-1/2 rounded-full bg-primary ring-4 ring-background max-lg:hidden"
                />
                <time dateTime={new Date(`${group.date} UTC`).toISOString().slice(0, 10)}>
                  <span className="text-base font-semibold text-foreground lg:block lg:text-lg">{day}</span>
                  <span className="text-sm text-muted-foreground max-lg:before:content-[',_'] lg:block">{year}</span>
                </time>
              </p>
            </div>
            <div className="divide-y divide-border">
              {group.rows.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
