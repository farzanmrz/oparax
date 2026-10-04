import Link from "next/link";
import { ItemCard } from "@/components/monitor/item-card";
import { StoryCard } from "@/components/monitor/story-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { monitorContent as copy } from "@/lib/monitor/content";
import type { MonitorFeed } from "@/lib/monitor/read";

export function Feed({
  feed,
  handle,
  view,
  storyId,
}: {
  feed: MonitorFeed;
  handle: string;
  view?: string;
  storyId?: string;
}) {
  const selected = storyId ? "stories" : view === "articles" ? "articles" : "stories";
  return (
    <section aria-label={copy.feed} className="space-y-4">
      <div role="status" className="space-y-2 text-sm text-muted-foreground">
        {feed.pending ? <p>{copy.pendingItems(feed.pending)}</p> : null}
        {feed.failed ? <p>{copy.failedItems(feed.failed)}</p> : null}
      </div>
      <Tabs
        key={`${selected}:${feed.storiesBefore}:${feed.articlesBefore}:${storyId ?? ""}`}
        defaultValue={selected}
      >
        <TabsList className="min-h-12 desk:min-h-8" aria-label={copy.feed}>
          <TabsTrigger value="stories" className="min-h-11 text-sm text-foreground desk:min-h-6">
            {copy.stories}
          </TabsTrigger>
          <TabsTrigger value="articles" className="min-h-11 text-sm text-foreground desk:min-h-6">
            {copy.articles}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="stories" className="space-y-4 pt-3">
          <h2 className="sr-only">{copy.stories}</h2>
          {!feed.stories.length && !feed.pending ? (
            <p className="text-base text-muted-foreground">{copy.noNews}</p>
          ) : null}
          {feed.stories.map((story) => (
            <StoryCard
              key={story.id}
              card={story.card}
              story={{ ...story, current: story.id === storyId }}
              handle={handle}
            />
          ))}
          {feed.storiesBefore ? (
            <Button asChild variant="outline" className="min-h-11 desk:min-h-6">
              <Link
                href={`/${handle}?before=${encodeURIComponent(feed.storiesBefore)}&beforeId=${encodeURIComponent(feed.storiesBeforeId ?? "")}&view=stories`}
              >
                {copy.loadMore}
              </Link>
            </Button>
          ) : null}
        </TabsContent>
        <TabsContent value="articles" className="space-y-4 pt-3">
          <h2 className="sr-only">{copy.articles}</h2>
          {!feed.articles.length && !feed.pending ? (
            <p className="text-base text-muted-foreground">{copy.noNews}</p>
          ) : null}
          {feed.articles.map((article) => (
            <ItemCard key={article.item.id} {...article} />
          ))}
          {feed.articlesBefore ? (
            <Button asChild variant="outline" className="min-h-11 desk:min-h-6">
              <Link
                href={`/${handle}?before=${encodeURIComponent(feed.articlesBefore)}&beforeId=${encodeURIComponent(feed.articlesBeforeId ?? "")}&view=articles`}
              >
                {copy.loadMore}
              </Link>
            </Button>
          ) : null}
        </TabsContent>
      </Tabs>
    </section>
  );
}
