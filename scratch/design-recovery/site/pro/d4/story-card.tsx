"use client";

import { cn } from "@/lib/utils";
import { SourceIcon, sourceHost } from "../shared/brand";
import { feed, type Story } from "../content";
import { scrollStory } from "./content";

// Clustered story as a reader meets it: title, facts, supporting photo, sources once.
export function StoryCard({
  story,
  className,
  markAdded = false,
  headingLevel = 3,
  photo = "thumb",
}: {
  story: Story;
  className?: string;
  markAdded?: boolean;
  headingLevel?: 3 | 4;
  photo?: "thumb" | "strip";
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const addedIndex = markAdded ? story.facts.length - 1 : -1;
  return (
    <article className={cn("flex flex-col rounded-xl border border-border bg-card p-4 text-card-foreground", className)}>
      <div className="flex gap-3.5">
        <Heading className="min-w-0 flex-1 text-[17px] font-semibold leading-snug tracking-tight text-balance">
          {story.title}
        </Heading>
        {story.image && photo === "thumb" && (
          <img src={story.image} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
        )}
      </div>
      <ul className="mt-3 mb-3.5 flex flex-1 flex-col gap-2">
        {story.facts.map((fact, index) => (
          <li key={fact} className="flex gap-2.5 text-[13.5px] leading-snug">
            <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              {fact}
              {index === addedIndex && (
                <span className="mt-1 block text-xs font-medium text-primary">{scrollStory.steps[2].change}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {story.image && photo === "strip" && (
        <figure className="mb-3.5">
          <img src={story.image} alt="" className="h-24 w-full rounded-lg object-cover object-[50%_60%]" />
          <figcaption className="mt-1.5 text-[11px] text-muted-foreground">Photo: {story.imageCredit}</figcaption>
        </figure>
      )}
      <footer className="border-t border-border pt-3">
        <p className="sr-only">{feed.sourcesLabel}</p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {story.sources.map((source) => (
            <li key={source.url} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <SourceIcon source={source} className="size-3.5" />
              <span className="font-medium text-foreground">{source.name}</span>
              <span>{sourceHost(source)}</span>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}
