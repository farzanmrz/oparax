import Link from "next/link";
import { SourceMark } from "@/components/one/marks";
import { lift } from "@/components/one/stage";
import { monitorContent as copy } from "@/lib/monitor/content";
import { type FeedItem, type FeedStory, when } from "@/lib/monitor/present";
import { cn } from "@/lib/utils";

// The One story card (design preview v2/one/card.tsx): the picture on top, 172px, when there is one; one
// top row that never clips (the source marks, three then +N, ONE source name that truncates, and the time, which
// never shrinks); the headline; every fact. An imageless card starts at its source row on the same surface, no wash.

const MAX_MARKS = 3;
/** The first mark sits on top of the next. */
const stack = ["z-30", "z-20", "z-10"];

/** One entry per distinct source in the story, in the story's own item order. */
function sourcesIn(story: FeedStory): FeedItem[] {
  return [...new Map(story.items.map((item) => [item.label, item])).values()];
}

export function OneCard({
  story,
  compact = false,
  className,
}: {
  story: FeedStory;
  /** The headline without its facts, for the cards set back in the sign-in fan. */
  compact?: boolean;
  className?: string;
}) {
  const sources = sourcesIn(story);
  const shown = sources.slice(0, MAX_MARKS);
  const extra = sources.length - shown.length;
  const lead = sources[0];
  const size = story.image ? 18 : 20;
  return (
    <article
      id={story.id}
      aria-current={story.current ? "true" : undefined}
      className={cn(
        lift,
        "relative flex scroll-mt-6 flex-col overflow-hidden",
        story.current && "ring-2 ring-[var(--brand-line)]",
        className,
      )}
    >
      {story.image ? (
        <div className="relative h-[172px] shrink-0 overflow-hidden border-b border-line">
          {/* biome-ignore lint/performance/noImgElement: Publisher images use the browser with no referrer. */}
          <img
            src={story.image}
            alt={copy.imageAlt}
            width={1200}
            height={675}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 hidden bg-gradient-to-t from-[var(--window)]/55 via-transparent to-transparent dark:block"
          />
        </div>
      ) : null}
      <div className="relative flex-1 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 items-center">
            {shown.map((item, i) => (
              <span
                key={item.id}
                title={item.label}
                className={cn(
                  "relative ring-2 ring-[var(--window)]",
                  item.kind === "post" ? "rounded-full" : "rounded-[5px]",
                  stack[i],
                  i > 0 && (story.image ? "-ml-[5px]" : "-ml-1.5"),
                )}
              >
                <SourceMark
                  kind={item.kind === "post" ? "x" : "site"}
                  mark={item.mark}
                  size={size}
                />
              </span>
            ))}
            {extra > 0 ? (
              <span className="ml-1.5 text-[11.5px] font-medium text-t3 tabular-nums">
                +{extra}
              </span>
            ) : null}
          </span>
          {lead ? (
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-t1">
              {lead.url ? (
                <a href={lead.url} className="underline-offset-4 hover:underline">
                  {lead.label}
                </a>
              ) : (
                lead.label
              )}
            </span>
          ) : (
            <span className="flex-1" />
          )}
          <time
            dateTime={story.time}
            className="shrink-0 text-[11.5px] whitespace-nowrap text-t3 tabular-nums"
          >
            {when(story.time)}
          </time>
        </div>
        <h3 className="mt-2.5 text-[16.5px] leading-[1.3] font-semibold tracking-[-0.01em] text-t1">
          {story.href ? (
            <Link href={story.href} className="underline-offset-4 hover:underline">
              {story.headline}
            </Link>
          ) : (
            story.headline
          )}
        </h3>
        {compact ? null : story.facts.length ? (
          <ul className="mt-2.5 space-y-2">
            {story.facts.map((fact) => (
              <li key={fact} className="flex gap-2.5 text-[13.5px] leading-[1.5]">
                <span
                  aria-hidden="true"
                  className="mt-[0.62em] size-1 shrink-0 rounded-full bg-t3"
                />
                <span className="min-w-0 text-t2">{fact}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-t3">{copy.unverified}</p>
        )}
      </div>
    </article>
  );
}
