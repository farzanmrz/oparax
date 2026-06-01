"use client"

// Imports
import {
  enrichTweet,
  useTweet,
  TweetContainer,
  TweetHeader,
  TweetInReplyTo,
  TweetBody,
  TweetMedia,
  TweetInfo,
  TweetNotFound,
  TweetSkeleton,
  QuotedTweet,
} from "react-tweet"
import styles from "./compact-tweet.module.css"

/**
 * A trimmed, half-size source embed built from react-tweet's own parts instead
 * of the default `<Tweet>`. Composition lets us end at `TweetInfo` (the
 * datetime) and omit `TweetActions` + `TweetReplies` — removing the divider and
 * the like/reply/copy + replies bar. Sizing + logo removal live in the CSS
 * module. Fetches client-side via `useTweet`, pointed at our normalizing proxy.
 * @param props.id - numeric tweet id
 * @param props.apiUrl - proxy endpoint that backfills the entity arrays
 * @returns the compact embedded tweet, or a skeleton / not-found fallback
 */
export function CompactTweet({ id, apiUrl }: { id: string; apiUrl?: string }) {
  const { data, error, isLoading } = useTweet(id, apiUrl)

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <TweetSkeleton />
      </div>
    )
  }
  if (error || !data) {
    return <TweetNotFound error={error} />
  }

  const tweet = enrichTweet(data)
  return (
    <div className={styles.wrapper}>
      <TweetContainer>
        <TweetHeader tweet={tweet} />
        {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
        <TweetBody tweet={tweet} />
        {tweet.mediaDetails?.length ? <TweetMedia tweet={tweet} /> : null}
        {tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
        <TweetInfo tweet={tweet} />
      </TweetContainer>
    </div>
  )
}
