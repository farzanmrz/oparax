import type { FeedStory } from "@/next/data/feed";

/** Server-rendered facts with their citations (the feeds' Facts without the open-in-place quotes). */
export function Facts({ story, max, className }: { story: FeedStory; max?: number; className?: string }) {
  const byId = new Map(story.items.map((i) => [i.id, i]));
  const facts = max ? story.card.facts.slice(0, max) : story.card.facts;
  return (
    <ul className={`s3-facts ${className ?? ""}`}>
      {facts.map((f, i) => {
        const cited = [...new Set(f.evidence.map((e) => byId.get(e.item)!.publisher))];
        return (
          <li key={i}>
            <span>
              {f.text} <span className="cite">({cited.join(", ")})</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
