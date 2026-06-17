import { extractTweetId } from "@/lib/scan/parse";
import { getTweetsByIds } from "@/lib/x/client";

/**
 * Fetch the text of a single tweet from the Twitter/X free syndication
 * endpoint (no auth required). Returns null on any failure — never throws.
 *
 * Used as the per-id fallback when the X API v2 lookup cannot return a tweet
 * (e.g. X_BEARER_TOKEN unset, rate-limited, or that id missing from the batch).
 *
 * @param url - an X/Twitter status URL
 * @returns the tweet URL + text, or null if the fetch or parse failed
 */
export async function fetchTweetText(url: string): Promise<{
  url: string;
  text: string;
} | null> {
  try {
    const id = extractTweetId(url);
    if (!id) return null;

    const response = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en`,
      {
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) return null;

    const body = (await response.json().catch(() => null)) as {
      text?: unknown;
    } | null;
    if (typeof body?.text !== "string" || !body.text) return null;

    return {
      url,
      text: body.text,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch tweet text for multiple URLs. Primary path is the X API v2 batch lookup
 * (`GET /2/tweets?ids=…`) with the app bearer token (public read) — reliable for
 * the long-form posts the old syndication endpoint failed on. Any url whose id
 * the API didn't return (or all of them, if the API call fails) falls back to
 * the free syndication endpoint per id. Partitions results into fetched /
 * failed. Non-throwing.
 *
 * @param urls - X/Twitter status URLs
 * @returns { fetched, failed }
 */
export async function fetchExampleTweets(
  urls: string[],
  userToken?: string | null,
): Promise<{
  fetched: {
    url: string;
    text: string;
  }[];
  failed: string[];
}> {
  const fetched: {
    url: string;
    text: string;
  }[] = [];

  // Parse ids up front; urls that aren't X status URLs go straight to failed.
  const parsed = urls.map((url) => ({ url, id: extractTweetId(url) }));
  const withId = parsed.filter((p): p is { url: string; id: string } => p.id !== null);

  // --- Primary: X API v2 batch lookup (≤100 ids per call). ---
  // Prefer the connected user's OAuth token: with tweet.read it sees everything
  // they can view, including protected accounts they follow. Fall back to the
  // app-only bearer (public reads) when no user token is available. Either is
  // sent as a normal Bearer credential on /2/tweets.
  const textById = new Map<string, string>();
  const token = userToken ?? process.env.X_BEARER_TOKEN ?? null;
  if (token && withId.length > 0) {
    try {
      const ids = [...new Set(withId.map((p) => p.id))];
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const result = await getTweetsByIds(token, batch);
        if (result.ok) {
          for (const t of result.tweets) textById.set(t.id, t.text);
        }
      }
    } catch {
      // Fall through to syndication for everything below.
    }
  }

  // --- Resolve each url: API hit, else per-id syndication fallback. ---
  const needsFallback: { url: string }[] = [];
  for (const p of withId) {
    const apiText = textById.get(p.id);
    if (apiText) {
      fetched.push({ url: p.url, text: apiText });
    } else {
      needsFallback.push({ url: p.url });
    }
  }

  const fallbackResults = await Promise.all(needsFallback.map((p) => fetchTweetText(p.url)));

  const failed: string[] = [];
  for (const p of parsed) {
    if (p.id === null) failed.push(p.url);
  }
  for (let i = 0; i < needsFallback.length; i++) {
    const r = fallbackResults[i];
    if (r) {
      fetched.push(r);
    } else {
      failed.push(needsFallback[i].url);
    }
  }

  return {
    fetched,
    failed,
  };
}
