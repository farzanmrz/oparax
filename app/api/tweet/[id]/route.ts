// Imports

import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import type { Tweet, TweetBase, TweetEntities } from "react-tweet/api";
import { getTweet } from "react-tweet/api";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// The syndication API only includes entity sub-arrays that are non-empty
// (e.g. just `entities.media`), but react-tweet's enrichTweet assumes
// hashtags/user_mentions/urls/symbols are always arrays and otherwise throws
// "entities is not iterable" during render. Backfill the missing arrays so the
// client <Tweet> can render any tweet, including nested quoted/parent tweets.
function normalizeEntities(tweet: TweetBase): void {
  const entities = tweet.entities as Partial<TweetEntities> | undefined;
  if (!entities) return;
  entities.hashtags ??= [];
  entities.user_mentions ??= [];
  entities.urls ??= [];
  entities.symbols ??= [];
}

function normalizeTweet(tweet: Tweet): Tweet {
  normalizeEntities(tweet);
  if (tweet.quoted_tweet) normalizeEntities(tweet.quoted_tweet);
  if (tweet.parent) normalizeEntities(tweet.parent);
  return tweet;
}

// Cache by id (tweet data is public, so the key is user-independent). Avoids
// re-hitting the syndication API on every page load / UI iteration.
const getCachedTweet = unstable_cache(async (id: string) => getTweet(id), ["react-tweet"], {
  revalidate: 3600 * 24,
});

/**
 * Proxy + normalize a tweet for the client `<Tweet apiUrl>` embed. Fetches from
 * the Twitter syndication API server-side (instead of react-tweet's shared
 * hosted proxy) and backfills the empty entity arrays the API omits.
 * @param _req - unused
 * @param context.params - dynamic tweet id
 * @returns `{ data: Tweet | null }` in the shape react-tweet's fetcher expects
 */
export async function GET(
  _req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  if (!/^[0-9]+$/.test(id)) {
    return NextResponse.json(
      {
        error: "Invalid tweet id.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const tweet = await getCachedTweet(id);
    return NextResponse.json({
      data: tweet ? normalizeTweet(tweet) : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch tweet.",
      },
      {
        status: 502,
      },
    );
  }
}
