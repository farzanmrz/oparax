"use client";

// Reading pieces shared by the demo, the Direct/Clustered pair and the feed, so every story keeps
// one order: title, facts, sources once, then an optional supporting photo.
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceIcon, sourceHost } from "../shared/brand";
import { evidence, feed, type Source } from "../content";

export const tile =
  "rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_1px_rgb(9_15_29/0.04),0_12px_28px_-16px_rgb(9_15_29/0.22)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_24px_48px_-24px_rgb(0_0_0/0.7)]";

export function FactList({ facts, className }: { facts: readonly string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2 text-sm leading-relaxed", className)}>
      {facts.map((fact) => (
        <li key={fact} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-primary" />
          <span>
            {fact}
            {fact === evidence.story.addedFact && (
              <span className="mt-0.5 block text-xs font-medium text-primary">{feed.addedFromUpdate}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Sources appear once per story: identity chips that link to the originals.
export function SourceChips({
  sources,
  active,
  compact = false,
  className,
}: {
  sources: readonly Source[];
  active?: number | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <ul aria-label={feed.sourcesLabel} className={cn("flex flex-wrap gap-1.5", className)}>
      {sources.map((source, index) => (
        <li key={source.url}>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            title={source.title}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-secondary px-2 text-xs font-medium text-secondary-foreground transition-[border-color,box-shadow] duration-200 hover:border-primary max-desk:h-11 max-desk:px-3",
              active === index && "border-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary),transparent_75%)]",
            )}
          >
            <SourceIcon source={source} />
            {source.name}
            {!compact && <span className="font-normal text-muted-foreground">{sourceHost(source)}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Original source identity for a single-source (Direct) item.
export function SourceIdentity({ source, className }: { source: Source; className?: string }) {
  return (
    <p className={cn("flex min-w-0 items-center gap-2 text-sm", className)}>
      <SourceIcon source={source} className="size-5" />
      <span className="font-semibold">{source.name}</span>
      <span className="truncate text-muted-foreground">{sourceHost(source)}</span>
    </p>
  );
}

export function OpenOriginal({ source, className }: { source: Source; className?: string }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline max-desk:h-11",
        className,
      )}
    >
      {feed.openOriginal}
      <ArrowUpRight className="size-4" aria-hidden="true" />
      <span className="sr-only">, {source.name}</span>
    </a>
  );
}

export function StoryPhoto({
  src,
  alt,
  credit,
  className,
  imgClassName,
  fill = false,
}: {
  src: string;
  alt: string;
  credit?: string;
  className?: string;
  imgClassName?: string;
  // Fill the space left by neighbouring tiles without letting the photo set the row height.
  fill?: boolean;
}) {
  const img = <img src={src} alt={alt} className={cn("w-full rounded-lg object-cover", fill && "absolute inset-0 size-full", imgClassName)} />;
  return (
    <figure className={cn("min-w-0", className)}>
      {fill ? <div className="relative min-h-48 flex-1">{img}</div> : img}
      {credit && <figcaption className="mt-1.5 text-xs text-muted-foreground">{credit}</figcaption>}
    </figure>
  );
}
