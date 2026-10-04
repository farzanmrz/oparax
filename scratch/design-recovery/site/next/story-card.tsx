"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, Newspaper } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Collapsible } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { FeedStory, ItemView } from "./data/feed";

// The card per LOCKED-PLAN: plain title, bullet facts, a parenthesized citation per fact that opens the
// quiet "Used N sources" area (AI Elements Sources, controlled) and highlights that fact's quotes. No image,
// no time, nothing else. Direct versus Clustered shows only through the sources line: one mark or a stack.

const host = (item: ItemView) =>
  item.kind === "post" ? `${item.author} on X` : new URL(item.url).hostname.replace(/^www\./, "");

function ItemMark({ item, className }: { item: ItemView; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground",
        className,
      )}
      aria-hidden="true"
    >
      {item.kind === "post" ? <XLogo className="size-2.5" /> : <Newspaper className="size-2.5" />}
    </span>
  );
}

export function StoryCard({
  story,
  highlighted = false,
  openSources = false,
  revealed,
  compact = false,
}: {
  story: FeedStory;
  highlighted?: boolean;
  openSources?: boolean;
  /** Landing hero only: the items that have arrived so far. */
  revealed?: string[];
  /** Landing hero: tighter padding and type, same anatomy. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(openSources);
  const [active, setActive] = useState<number | null>(null);
  const items = revealed ? story.items.filter((i) => revealed.includes(i.id)) : story.items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const facts = story.card.facts
    .map((fact, index) => ({ ...fact, index, evidence: fact.evidence.filter((e) => byId.has(e.item)) }))
    .filter((fact) => fact.evidence.length > 0);

  const cite = (index: number) => {
    const next = active === index && open ? null : index;
    setActive(next);
    setOpen(next !== null ? true : open);
  };

  return (
    <article
      aria-current={highlighted ? "true" : undefined}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgb(9_15_29/0.05),0_6px_20px_-12px_rgb(9_15_29/0.25)]",
        compact ? "p-5" : "p-6",
        // Neutral stronger border for the story opened from an alert (round 1 change 24).
        highlighted && "border-muted-foreground/70 ring-1 ring-muted-foreground/40",
      )}
    >
      <h3 className={cn("leading-snug font-semibold tracking-tight text-balance", compact ? "text-lg" : "text-xl")}>
        {story.card.headline}
      </h3>
      <ul className={cn("space-y-2", compact ? "mt-3" : "mt-3.5")}>
        {facts.map((fact) => {
          const names = [...new Set(fact.evidence.map((e) => byId.get(e.item)!.publisher))];
          const on = active === fact.index && open;
          return (
            <li key={fact.index} className={cn("flex gap-3 leading-relaxed", compact ? "text-sm" : "text-[15px]")}>
              <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden="true" />
              <p>
                {fact.text}{" "}
                <button
                  type="button"
                  onClick={() => cite(fact.index)}
                  aria-expanded={on}
                  aria-label={`Show the quote${fact.evidence.length > 1 ? "s" : ""} from ${names.join(" and ")}`}
                  className={cn(
                    "rounded-sm text-sm whitespace-nowrap text-muted-foreground underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring",
                    on && "text-primary underline",
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
        className="not-prose mt-5 border-t border-border pt-3.5 text-xs text-muted-foreground"
      >
        <SourcesTrigger count={items.length} className="group rounded-sm hover:text-foreground">
          <span className="flex -space-x-1.5" aria-hidden="true">
            {items.map((item) => (
              <ItemMark key={item.id} item={item} className="ring-2 ring-card" />
            ))}
          </span>
          <span>
            Used {items.length} {items.length === 1 ? "source" : "sources"}
          </span>
          <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </SourcesTrigger>
        <SourcesContent className="w-full gap-3">
          {items.map((item) => {
            const quotes = story.card.facts.flatMap((fact, index) =>
              fact.evidence.filter((e) => e.item === item.id).map((e) => ({ index, span: e.span })),
            );
            const relevant = active === null || quotes.some((q) => q.index === active);
            return (
              <div key={item.id} className={cn("transition-opacity", !relevant && "opacity-45")}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-foreground hover:text-primary"
                >
                  <ItemMark item={item} />
                  <span className="text-[13px] font-medium">{item.publisher}</span>
                  <span className="text-muted-foreground">{host(item)}</span>
                  <ArrowUpRight className="size-3 text-muted-foreground" aria-hidden="true" />
                </a>
                <ul className="mt-1.5 ml-[9px] space-y-1 border-l border-border pl-4">
                  {quotes.map((q, i) => (
                    <li
                      key={i}
                      className={cn(
                        "rounded-sm px-2 py-1 text-[13px] leading-snug transition-colors",
                        active === q.index ? "bg-primary/12 text-foreground" : "text-muted-foreground",
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
