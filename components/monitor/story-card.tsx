import Link from "next/link";
import { CardFacts, cardShadow, NewsImage } from "@/components/monitor/item-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { monitorContent as copy, displayTime, safeWebUrl } from "@/lib/monitor/content";
import type { DisplayStory, PublicItem, VerifiedCard } from "@/lib/monitor/read";

type Story = Pick<DisplayStory, "id" | "fallback_title" | "last_changed_at" | "image"> & {
  reports?: PublicItem[];
  current?: boolean;
};

export function StoryCard({
  card,
  story,
  handle,
  compact = false,
}: {
  card: VerifiedCard | null;
  story: Story;
  handle: string;
  compact?: boolean;
}) {
  const reports = story.reports ?? [];
  const citedIds = new Set(
    card?.facts.flatMap((fact) => fact.evidence.map((evidence) => evidence.item)) ?? [],
  );
  const further = reports.filter((item) => !citedIds.has(item.id));
  return (
    <Card
      id={story.id}
      aria-current={story.current ? "true" : undefined}
      className={`scroll-mt-20 ${cardShadow}`}
    >
      {!compact ? <NewsImage src={card?.image ?? story.image} /> : null}
      <CardHeader className="gap-2">
        <h3 className="font-heading text-xl font-semibold">
          <Link
            href={`/${handle}/${story.id}`}
            className="inline-flex min-h-11 items-center underline-offset-4 hover:underline desk:min-h-6"
          >
            {card?.headline || story.fallback_title || copy.unverified}
          </Link>
        </h3>
        <time dateTime={story.last_changed_at} className="text-xs text-muted-foreground">
          {displayTime(story.last_changed_at)}
        </time>
      </CardHeader>
      <CardContent className="space-y-4">
        {card?.facts.length ? (
          <CardFacts card={card} items={reports} />
        ) : (
          <Badge variant="secondary">{copy.unverified}</Badge>
        )}
        {further.length ? (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="min-h-11 desk:min-h-6">
                {copy.reports(further.length)}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="space-y-2 pt-2">
                {further.map((report) => {
                  const href = safeWebUrl(report.url);
                  return (
                    <li key={report.id} className="space-x-2 text-sm">
                      {href ? (
                        <a
                          href={href}
                          className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 desk:min-h-6"
                        >
                          {report.title || report.publisher || copy.original}
                        </a>
                      ) : (
                        report.title
                      )}
                      {report.publisher ? (
                        <span className="text-muted-foreground">{report.publisher}</span>
                      ) : null}
                      {report.lang ? <Badge variant="outline">{report.lang}</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CardContent>
    </Card>
  );
}
