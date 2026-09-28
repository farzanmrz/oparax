import { Badge } from "@/components/ui/badge";
import { monitorContent as copy, displayTime, safeWebUrl } from "@/lib/monitor/content";
import type { MonitorFeed } from "@/lib/monitor/read";

export function DigestBlock({
  items,
  github,
  productHunt,
}: {
  items: MonitorFeed["digests"];
  github: boolean;
  productHunt: boolean;
}) {
  if (!github && !productHunt) return null;
  const shown = items.filter((item) => (item.kind === "product_hunt" ? productHunt : github));
  return (
    <section aria-labelledby="digests-heading" className="space-y-4">
      <h2 id="digests-heading" className="font-heading text-xl font-bold">
        {copy.digests}
      </h2>
      {!shown.length ? <p className="text-muted-foreground">{copy.digestEmpty}</p> : null}
      <ul className="space-y-5">
        {shown.map((item) => {
          const href = safeWebUrl(item.url);
          return (
            <li key={item.id} className="space-y-2">
              <Badge variant="outline">
                {item.kind === "product_hunt" ? copy.productHunt : copy.github}
              </Badge>
              <h3 className="font-heading font-bold">
                {href ? (
                  <a
                    href={href}
                    className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 desk:min-h-6"
                  >
                    {item.name}
                  </a>
                ) : (
                  item.name
                )}
              </h3>
              <p>{item.description}</p>
              <p>{item.why_now}</p>
              <time dateTime={item.created_at} className="font-mono text-xs text-muted-foreground">
                {displayTime(item.created_at)}
              </time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
