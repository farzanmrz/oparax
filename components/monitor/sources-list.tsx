import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import type { MonitorFeed } from "@/lib/monitor/read";

export function SourcesList({ sources }: { sources: MonitorFeed["sources"] }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section aria-labelledby="sources-heading" className="space-y-4">
      <h2 id="sources-heading" className="font-heading text-xl font-semibold">
        {copy.sources}
      </h2>
      {!sources.length ? <p className="text-muted-foreground">{copy.noSources}</p> : null}
      <ul className="space-y-5">
        {sources.map(({ source_id, sources: source, why }) => {
          if (!source) return null;
          const href = safeWebUrl(source.target);
          return (
            <li key={source_id} className="space-y-1">
              <h3 className="font-heading font-semibold">
                {href ? (
                  <a
                    href={href}
                    className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline desk:min-h-6"
                  >
                    {source.name}
                  </a>
                ) : (
                  source.name
                )}
              </h3>
              <p>{source.focus}</p>
              <p className="text-sm text-muted-foreground">{why}</p>
              {source.unreadable_streak > 0 ? (
                <p className="text-sm text-destructive">
                  {copy.unreadable(source.unreadable_streak)}
                </p>
              ) : null}
              {source.paused_at?.slice(0, 10) === today ? (
                <p className="text-sm text-amber-800 dark:text-amber-300">{copy.sourcePaused}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
