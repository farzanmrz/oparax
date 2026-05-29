// Imports
import { Tweet } from "react-tweet"
import { extractTweetId } from "@/lib/scan/parse"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DraftEditor, type ExistingDraft } from "@/components/loop/draft-editor"

// A persisted story rendered in the list (subset of the stories row)
export interface StoryListItem {
  id: string
  title: string
  summary: string
  source_urls: string[]
  primary_tweet_url: string
}

/**
 * Render the monitor's stories, embedding the primary source tweet via
 * react-tweet when the primary URL is an X status URL, with the remaining
 * source URLs as links.
 * @param props.stories - the stories to render (newest first)
 * @param props.drafts - existing drafts keyed by story id
 * @returns the story list, or an empty-state message
 */
export function StoryList({
  stories,
  drafts,
}: {
  stories: StoryListItem[]
  drafts: Record<string, ExistingDraft>
}) {
  if (stories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No stories yet. Run a scan to surface stories.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {stories.map((story) => {

        // Tweet id from the primary X URL, when present, drives the embed
        const tweetId = story.primary_tweet_url
          ? extractTweetId(story.primary_tweet_url)
          : null

        return (
          <Card key={story.id}>
            <CardHeader>
              <CardTitle className="text-base">{story.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {story.summary}
              </p>
              {tweetId && (
                <div data-theme="light" className="flex justify-center">
                  <Tweet id={tweetId} />
                </div>
              )}
              {story.source_urls.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {story.source_urls.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-link underline underline-offset-4"
                    >
                      source {index + 1}
                    </a>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-3">
                <DraftEditor
                  storyId={story.id}
                  initialDraft={drafts[story.id] ?? null}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
