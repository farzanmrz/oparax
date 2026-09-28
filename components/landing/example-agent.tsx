import Link from "next/link";
import { StoryCard } from "@/components/monitor/story-card";
import { Button } from "@/components/ui/button";
import { landingContent } from "@/lib/landing/content";
import type { DisplayStory } from "@/lib/monitor/read";

export type LandingExample = { brief: string; stories: DisplayStory[] };

export function ExampleAgent({ example }: { example: LandingExample }) {
  const copy = landingContent.example;
  return (
    <section aria-labelledby="example-title" className="space-y-6 wrap-anywhere">
      <h2 id="example-title" className="font-heading text-2xl font-bold">
        {copy.title}
      </h2>
      <p className="text-base text-muted-foreground">{example.brief}</p>
      <div className="grid gap-4 desk:grid-cols-3">
        {example.stories.map((story) => (
          <StoryCard key={story.id} card={story.card} story={story} handle={copy.handle} compact />
        ))}
      </div>
      <Button asChild variant="outline" className="min-h-11 desk:min-h-8">
        <Link href={`/${copy.handle}`}>{copy.open}</Link>
      </Button>
    </section>
  );
}
