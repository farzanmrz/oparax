import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import type { DisplayItem } from "@/lib/monitor/read";

export function SkippedList({ items }: { items: DisplayItem[] }) {
  if (!items.length) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="min-h-11 desk:min-h-6">
          {copy.skipped}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-3 pt-4">
          {items.map(({ item, score }) => {
            const href = safeWebUrl(item.url);
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {href ? (
                  <a
                    href={href}
                    className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 desk:min-h-6"
                  >
                    {item.title || copy.original}
                  </a>
                ) : (
                  <span>{item.title}</span>
                )}
                {score !== null ? <Badge variant="secondary">{copy.score(score)}</Badge> : null}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
