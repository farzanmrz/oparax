import { getUserByUsername, getUserTweets } from "@/lib/x/client";

// How many recent original posts we surface as voice examples.
const MAX_EXAMPLES = 8;
// Over-fetch a little so we still have ~8 after API-side filtering jitter.
const FETCH_SIZE = 10;

export interface RecentPostsResult {
  /** True when the timeline read succeeded (even if it returned 0 posts). */
  ok: boolean;
  /** Up to MAX_EXAMPLES recent original tweet texts (no retweets/replies). */
  posts: string[];
  /** The handle the posts belong to (echoed for the model's message). */
  username: string | null;
  /** Readable reason when ok is false (e.g. no bearer, API error). */
  error?: string;
}

/**
 * Fetch a connected user's recent original posts to use as voice examples.
 *
 * Identity resolution: prefer the X user id stored on the connection; if only a
 * username is known, resolve it via `GET /2/users/by/username/:username`. Then
 * read `GET /2/users/:id/tweets` with the user's OAuth token when connected (falls
 * back to the app bearer for public reads; with tweet.read this also returns the
 * user's own protected posts).
 *
 * Non-throwing: any failure returns `{ ok: false, posts: [], error }`.
 *
 * @param input.xUserId - the stored X user id, if available
 * @param input.username - the connected handle (no leading @), used to resolve
 *   the id when xUserId is absent and echoed back in the result
 * @returns up to ~8 recent original tweet texts
 */
export async function fetchRecentPosts(input: {
  xUserId?: string | null;
  username?: string | null;
  accessToken?: string | null;
}): Promise<RecentPostsResult> {
  const username = input.username ?? null;

  try {
    // Prefer the user's OAuth token (covers their OWN protected account and
    // protected accounts they follow); fall back to the app-only bearer.
    const token = input.accessToken ?? process.env.X_BEARER_TOKEN ?? null;
    if (!token) {
      return {
        ok: false,
        posts: [],
        username,
        error: "X API token is not configured.",
      };
    }

    // --- Resolve the X user id. ---
    let userId = input.xUserId ?? null;
    if (!userId) {
      if (!username) {
        return {
          ok: false,
          posts: [],
          username,
          error: "No X account identity available.",
        };
      }
      const resolved = await getUserByUsername(token, username);
      if (!resolved.ok) {
        return { ok: false, posts: [], username, error: resolved.error };
      }
      userId = resolved.id;
    }

    // --- Read the user's recent original posts. ---
    const result = await getUserTweets(token, userId, FETCH_SIZE);
    if (!result.ok) {
      return { ok: false, posts: [], username, error: result.error };
    }

    return {
      ok: true,
      posts: result.tweets.slice(0, MAX_EXAMPLES).map((t) => t.text),
      username,
    };
  } catch (err) {
    return {
      ok: false,
      posts: [],
      username,
      error: err instanceof Error ? err.message : "Failed to fetch recent posts.",
    };
  }
}
