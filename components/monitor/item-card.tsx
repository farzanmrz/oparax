import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { monitorContent as copy, displayTime, safeWebUrl } from "@/lib/monitor/content";
import type { DisplayItem, PublicItem, VerifiedCard } from "@/lib/monitor/read";

export const cardShadow =
  "shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_1px_-0.5px_rgba(0,0,0,0.06),0px_3px_3px_-1.5px_rgba(0,0,0,0.06),_0px_6px_6px_-3px_rgba(0,0,0,0.06),0px_12px_12px_-6px_rgba(0,0,0,0.06),0px_24px_24px_-12px_rgba(0,0,0,0.06)]";

export function NewsImage({ src }: { src: string | null }) {
  const url = safeWebUrl(src, true);
  if (!url) return null;
  return (
    // Publisher hosts are open-ended; only avatars go through Next's image optimizer.
    // biome-ignore lint/performance/noImgElement: Publisher images use the browser with no referrer.
    <img
      src={url}
      width={1200}
      height={675}
      alt={copy.imageAlt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="aspect-video w-full object-cover"
    />
  );
}

export function CardFacts({ card, items }: { card: VerifiedCard; items: PublicItem[] }) {
  return (
    <ul className="list-disc space-y-3 pl-5 text-base">
      {card.facts.map((fact) => {
        const evidence = fact.evidence.flatMap(({ item }) => {
          const report = items.find((candidate) => candidate.id === item);
          return report ? [{ url: report.url, name: report.publisher || copy.source }] : [];
        });
        const links = evidence.length ? evidence : card.publishers;
        const unique = [...new Map(links.map((link) => [link.url, link])).values()];
        return (
          <li key={fact.text}>
            <p>{fact.text}</p>
            <div className="flex flex-wrap gap-x-3 text-sm">
              {unique.map((source) => {
                const href = safeWebUrl(source.url);
                return href ? (
                  <a
                    key={source.url}
                    href={href}
                    className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 desk:min-h-6"
                  >
                    {source.name}
                  </a>
                ) : (
                  <span key={source.url}>{source.name}</span>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ItemCard({ item, card }: DisplayItem) {
  const href = safeWebUrl(item.url);
  return (
    <Card className={cardShadow}>
      <NewsImage src={card?.image ?? null} />
      <CardHeader className="gap-2">
        <h3 className="font-heading text-xl font-semibold">
          {card?.headline || item.title || copy.unverified}
        </h3>
        {item.kind === "post" && item.author ? (
          <p>
            {item.author.name} <span>@{item.author.handle}</span>
          </p>
        ) : null}
        <time dateTime={item.published_at} className="text-xs text-muted-foreground">
          {displayTime(item.published_at)}
        </time>
      </CardHeader>
      <CardContent className="space-y-3">
        {card?.facts.length ? (
          <CardFacts card={card} items={[item]} />
        ) : (
          <Badge variant="secondary">{copy.unverified}</Badge>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {href ? (
            <a
              href={href}
              className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4 desk:min-h-6"
            >
              {item.publisher || copy.original}
            </a>
          ) : null}
          {item.lang ? <Badge variant="outline">{item.lang}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}
