"use client";

// Direction 1 story pictures shared by the hero, the reading-modes panel and the feed:
// title first, then facts, then each source once. Photos support the story and never lead it.
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceIcon, sourceHost } from "../shared/brand";
import { evidence, feed, type DirectItem, type Source, type Story } from "../content";
import { feedCopy } from "./content";

export function SourceLink({
  source,
  stacked,
  className,
}: {
  source: Source;
  stacked?: boolean;
  className?: string;
}) {
  const kind = source.type === "x" ? feedCopy.postKind : sourceHost(source);
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group/src inline-flex min-w-0 items-center rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-desk:min-h-11",
        stacked ? "gap-2.5" : "gap-2",
        className,
      )}
    >
      <SourceIcon source={source} className={stacked ? "size-5" : "size-4"} />
      {stacked ? (
        <span className="min-w-0 leading-tight">
          <span className="block font-semibold text-foreground">{source.name}</span>
          <span className="block truncate text-xs">{kind}</span>
        </span>
      ) : (
        <>
          <span className="font-semibold text-foreground">{source.name}</span>
          <span className="truncate">{kind}</span>
        </>
      )}
      <ArrowUpRight
        className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 ease-out group-hover/src:-translate-y-0.5 group-hover/src:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}

export function FactList({ facts, dense, className }: { facts: string[]; dense?: boolean; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {facts.map((fact) => {
        const added = fact === feedCopy.addedFact;
        return (
          <li
            key={fact}
            className={cn(
              "relative pl-4 text-foreground/90",
              dense ? "text-sm leading-snug" : "text-[15px] leading-relaxed",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-[0.6em] left-0 size-1.5 rounded-full",
                added ? "bg-primary" : "bg-muted-foreground/60",
              )}
            />
            {added && <span className="block text-xs font-semibold text-primary">{feedCopy.added}</span>}
            {fact}
          </li>
        );
      })}
    </ul>
  );
}

export function StoryPhoto({ story, className }: { story: Story; className?: string }) {
  if (!story.image) return null;
  return (
    <figure className={cn("relative overflow-hidden rounded-lg border border-border bg-muted", className)}>
      <img src={story.image} alt={story.image === evidence.article.image ? evidence.article.imageAlt : ""} className="size-full object-cover" />
      <figcaption className="absolute right-1.5 bottom-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
        {story.imageCredit}
      </figcaption>
    </figure>
  );
}

// Clustered story card used inside the hero's middle stage and the reading-modes panel.
export function StoryCard({
  story,
  dense,
  className,
}: {
  story: Story;
  dense?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-[0_1px_2px_rgb(9_15_29/0.06),0_12px_32px_-12px_rgb(9_15_29/0.25)]",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl leading-snug font-semibold tracking-tight text-balance">{story.title}</h3>
          <FactList facts={story.facts} dense={dense} className="mt-3" />
        </div>
        <StoryPhoto story={story} className="aspect-[4/3] w-28 shrink-0 max-desk:hidden desk:w-32" />
      </div>
      <StoryPhoto story={story} className="mt-4 aspect-[16/9] w-full desk:hidden" />
      <div className="mt-auto pt-4">
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground">{feed.sourcesLabel}</p>
          <ul className={cn("mt-1.5 flex", dense ? "flex-wrap gap-x-4 gap-y-1" : "flex-col gap-1")}>
            {story.sources.map((source) => (
              <li key={source.url}>
                <SourceLink source={source} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

// One-source item: Oparax's headline and facts, then the original's identity and link.
export function DirectCard({ item, className }: { item: DirectItem; className?: string }) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-[0_1px_2px_rgb(9_15_29/0.06),0_12px_32px_-12px_rgb(9_15_29/0.25)]",
        className,
      )}
    >
      <h3 className="text-xl leading-snug font-semibold tracking-tight text-balance">{item.headline}</h3>
      <FactList facts={item.facts} className="mt-3" />
      <div className="mt-auto pt-4">
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground">{feedCopy.sourceLabel}</p>
          <SourceLink source={item.source} className="mt-1.5" />
        </div>
      </div>
    </article>
  );
}
