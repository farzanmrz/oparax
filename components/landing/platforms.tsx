import { Mail, MessageSquare, Rss } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { Badge } from "@/components/ui/badge";
import { landingContent } from "@/lib/landing/content";

type PlatformIconName =
  | "x"
  | "rss"
  | "github"
  | "producthunt"
  | "reddit"
  | "google"
  | "mail"
  | "slack"
  | "message";

function PlatformIcon({ name }: { name: PlatformIconName }) {
  switch (name) {
    case "rss":
      return <Rss aria-hidden="true" className="size-5" />;
    case "mail":
      return <Mail aria-hidden="true" className="size-5" />;
    case "message":
      return <MessageSquare aria-hidden="true" className="size-5" />;
    default:
      return <BrandIcon name={name} mono={name === "x" || name === "github"} className="size-5" />;
  }
}

export function Platforms() {
  const copy = landingContent.platforms;
  return (
    <section
      id="roadmap"
      aria-labelledby="roadmap-title"
      className="flex scroll-mt-28 flex-col gap-6 desk:scroll-mt-16"
    >
      <h2 id="roadmap-title" className="font-heading text-2xl font-semibold text-balance">
        {copy.title}
      </h2>
      <div className="grid gap-4 desk:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-lg font-semibold">{copy.worksToday}</h3>
          <ul className="mt-4 flex flex-col gap-4">
            {copy.today.map((item) => (
              <li key={item.name} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <PlatformIcon name={item.icon} />
                </span>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-lg font-semibold">{copy.planned}</h3>
          <ul className="mt-4 flex flex-col gap-4">
            {copy.later.map((item) => (
              <li key={item.name} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <PlatformIcon name={item.icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {copy.planned}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{copy.note}</p>
    </section>
  );
}
