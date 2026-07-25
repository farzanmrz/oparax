// app/agents/[id]/source-tweet.tsx
//
// The Feed's source post, rendered as a real tweet. A Server Component — react-tweet's
// package exports a dedicated "react-server" entry, and of its parts only the hooks, the SWR
// client, the copy button, the quoted-tweet container and the video player carry "use client";
// `TweetContainer`/`TweetHeader`/`TweetBody`/`TweetInfo` are plain presentation. So this whole
// card renders on the server with no client boundary and no hydration surface.
//
// Composition, not `<Tweet id>`: ending the stack at `TweetInfo` drops the like/reply/copy bar
// and the replies link — we render engagement we did not measure nowhere, and the card is a
// news artifact, not an interaction surface. This mirrors the shape the repo used before
// (`components/loop/compact-tweet.tsx`, since deleted), which composed the same parts for the
// same reason.
//
// TWO SOURCES, deliberately. The syndication API (free, unauthenticated, NOT our metered X API
// tier) serves the real post with avatar, media and verified badge. Our own `source_posts` row
// is the fallback AND the source of record: reporters delete and edit posts constantly, and a
// story we already drafted must not hollow out into "Tweet not found" because the source
// vanished. Fetch failures are therefore normal operation here, never an error.

import { enrichTweet, TweetBody, TweetContainer, TweetHeader, TweetInfo } from "react-tweet";
import type { Tweet } from "react-tweet/api";
import { getTweet } from "react-tweet/api";
import type { FeedStory } from "@/lib/agent/feed-query";
import { buildSyntheticTweet } from "@/lib/x/tweet-shape";

/** Tweet data is public and identical for every viewer, so it caches at the FETCH layer —
 *  `getTweet` forwards its second argument straight to `fetch`, and Next's `next.revalidate`
 *  keys on the request URL, which already carries the tweet id. A day is long relative to how
 *  fast a post's content changes and short relative to how long a story stays on the feed.
 *
 *  This deliberately does NOT use `unstable_cache`: calling it at module scope in a Server
 *  Component makes Turbopack's dev server fail the server render outright ("SourceTweet is not
 *  defined") and silently downgrade the whole page to client rendering. Production builds fine,
 *  so the failure only ever shows up in dev — which is exactly the kind of bug that erodes
 *  trust in the dev server. Fetch-level revalidation is also the Next 16 idiom. */
async function getCachedTweet(id: string): Promise<Tweet | undefined> {
  try {
    return await getTweet(id, { next: { revalidate: 60 * 60 * 24 } } as RequestInit);
  } catch {
    // A syndication outage must never take the Feed down — the stored copy still renders.
    return undefined;
  }
}

export async function SourceTweet({
  sourcePost,
}: {
  sourcePost: FeedStory["sourcePosts"][number];
}) {
  const fetched = sourcePost.xPostId ? await getCachedTweet(sourcePost.xPostId) : undefined;
  const tweet =
    fetched ??
    buildSyntheticTweet({
      id: sourcePost.xPostId,
      text: sourcePost.text,
      createdAt: sourcePost.postedAt,
      handle: sourcePost.authorHandle ?? "source",
      name: sourcePost.authorName,
    });

  const enriched = enrichTweet(tweet);

  return (
    <TweetContainer>
      <TweetHeader tweet={enriched} />
      <TweetBody tweet={enriched} />
      <TweetInfo tweet={enriched} />
    </TweetContainer>
  );
}
