import Link from "next/link";
import { SourceMark } from "@/components/one/marks";
import { lift } from "@/components/one/stage";
import { monitorContent as copy } from "@/lib/monitor/content";
import { type FeedStory, when } from "@/lib/monitor/present";
import { cn } from "@/lib/utils";

// The One story card (design preview v2/one/card.tsx): the image on top, the sources named at the top (they are the
// citations), the headline, then the facts with no publisher parentheses. No plates, no peek, no article count.

export function OneCard({ story }: { story: FeedStory }) {
  const labels = [...new Map(story.items.map((item) => [item.label, item])).values()];
  const lead = story.items[0]?.kind ?? "article";
  return (
    <article
      id={story.id}
      aria-current={story.current ? "true" : undefined}
      className={cn(
        lift,
        "relative scroll-mt-6 overflow-hidden",
        story.current && "ring-2 ring-[var(--brand-line)]",
      )}
    >
      {story.image ? (
        <div className="relative h-[172px] overflow-hidden border-b border-line">
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
            className="absolute inset-0 bg-gradient-to-t from-[var(--window)]/55 via-transparent to-transparent"
          />
        </div>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent",
            lead === "post" ? "from-[var(--kind-post-soft)]" : "from-[var(--kind-article-soft)]",
          )}
        />
      )}
      <div className="relative p-4">
        <div className="flex items-center gap-2">
          <span className="flex shrink-0 items-center">
            {labels.slice(0, 4).map((item, i) => (
              <span
                key={item.id}
                className={cn(
                  "ring-2 ring-[var(--window)]",
                  item.kind === "post" ? "rounded-full" : "rounded-[5px]",
                  i > 0 && "-ml-1.5",
                )}
              >
                <SourceMark
                  kind={item.kind === "post" ? "x" : "site"}
                  mark={item.mark}
                  size={story.image ? 18 : 22}
                />
              </span>
            ))}
          </span>
          <span className="min-w-0 truncate text-[12.5px] font-medium text-t1">
            {labels.map((item, i) => (
              <span key={item.id}>
                {i > 0 ? ", " : null}
                {item.url ? (
                  <a href={item.url} className="underline-offset-4 hover:underline">
                    {item.label}
                  </a>
                ) : (
                  item.label
                )}
              </span>
            ))}
          </span>
          <time
            dateTime={story.time}
            className="ml-auto shrink-0 text-[11.5px] text-t3 tabular-nums"
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
        {story.facts.length ? (
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
