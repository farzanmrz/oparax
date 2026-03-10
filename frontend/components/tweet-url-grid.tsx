"use client"

import { Tweet } from "react-tweet"

const TWEET_ID_RE = /x\.com\/.+\/status\/(\d+)/

function extractTweetId(url: string): string | null {
  const match = url.match(TWEET_ID_RE)
  return match?.[1] ?? null
}

export function TweetUrlGrid({
  urls,
  limit = 3,
}: {
  urls: string[]
  limit?: number
}) {
  const uniqueUrls = [...new Set(urls)].slice(0, limit)

  if (uniqueUrls.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {uniqueUrls.map((url) => {
        const tweetId = extractTweetId(url)

        if (!tweetId) {
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-primary underline underline-offset-2"
            >
              View source
            </a>
          )
        }

        return (
          <div key={url} className="max-w-[360px]">
            <Tweet id={tweetId} />
          </div>
        )
      })}
    </div>
  )
}
