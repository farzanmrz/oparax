// lib/x/timeline.ts
//
// The ONE designated extraction X-read: a reporter's recent original posts, for the voice corpus.
// SERVER-ONLY (reads X_BEARER_TOKEN, writes usage_events via the admin client).
//
// Replaces lib/web/brightdata.ts's pullXTimeline, which is deleted. Live-probed 2026-07-25:
// Bright Data's X posts dataset returns ZERO records for every profile — `@ReshadRahman` (242k
// followers) and `@FabrizioRomano` alike, in both discovery and direct-URL mode, with
// `error_codes: {"dead_page": 1}`. Their Web Unlocker fetches the same profile fine and shows
// why: X now serves logged-out clients a "Sign up now to get your own personalized timeline!"
// wall, so the scraper sees a bio and no posts. That is X closing a door, not a transient fault.
//
// This reads through X's own API instead, which is strictly better on every axis that was ever
// argued: it returns data at all, the newest post is minutes old rather than the 7d12h staleness
// AGENTS.md measured for Bright Data, and it is bounded by a project cap of 2,000,000 posts/month
// (157 used at cutover) rather than per-record scrape billing.
//
// APP-ONLY bearer, deliberately, not the reporter's OAuth token. Three reasons: it reads any
// public timeline, so the owner-handle override works without impersonating anyone; the cap is
// per-project rather than per-user; and there is no refresh lifecycle to get wrong on a path that
// runs unattended. AGENTS.md's old objection — "a user-context read still bills the app's own X
// tier" — was about USER-context reads and does not apply here.
import { createAdminClient } from "@/lib/supabase/admin";

const X_API = "https://api.x.com/2";

/** Same shape the extraction corpus adapter consumed before, so lib/voice/corpus.ts's mapping is
 *  unchanged apart from now having real engagement numbers to map. */
export type XTimelinePost = {
  xPostId: string;
  text: string;
  postedAt: string /* ISO */;
  likeCount: number;
  repostCount: number;
};

/** 100 posts, 80 train / 20 held-out — the corpus size the extraction recipe is calibrated
 *  against (.claude/rules/voice.md). X caps a page at 100, so this is usually one page. */
const MAX_POSTS = 100;
const PAGE_SIZE = 100;
/** Hard wall-clock bound: two or three API calls should take ~1s, so anything near this is a
 *  hang rather than slowness. */
const REQUEST_TIMEOUT_MS = 20_000;

function bearerToken(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not set");
  // Used RAW — URL-decoding the portal's %2B/%3D escapes produces a 401 (.claude/rules/x.md).
  return token;
}

async function xGet(path: string): Promise<Response> {
  return fetch(`${X_API}${path}`, {
    headers: { authorization: `Bearer ${bearerToken()}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/** Resolves a handle to its numeric id, which every timeline read is keyed by. Throws with the
 *  distinction the caller needs: a handle that does not exist is the reporter's problem, a 429 or
 *  5xx is ours. */
export async function resolveUserId(handle: string): Promise<{ id: string; postCount: number }> {
  const clean = handle.trim().replace(/^@/, "");
  const res = await xGet(
    `/users/by/username/${encodeURIComponent(clean)}?user.fields=public_metrics`,
  );
  const body = (await res.json()) as {
    data?: { id: string; public_metrics?: { tweet_count?: number } };
    errors?: { title?: string; detail?: string }[];
  };
  if (!res.ok) {
    throw new Error(
      `X user lookup failed for @${clean}: HTTP ${res.status} — ${JSON.stringify(body).slice(0, 200)}`,
    );
  }
  if (!body.data) {
    // X answers 200 with an `errors` array for a handle that does not exist or is suspended.
    const reason = body.errors?.[0]?.detail ?? body.errors?.[0]?.title ?? "no such account";
    throw new Error(`No X account found for @${clean} — ${reason}`);
  }
  return { id: body.data.id, postCount: body.data.public_metrics?.tweet_count ?? 0 };
}

/**
 * A reporter's most recent ORIGINAL posts.
 *
 * `exclude=retweets,replies` is a voice decision, not a convenience. A retweet is not the
 * reporter's writing at all. A reply is their writing, but the product drafts standalone posts
 * about news — and a reply-heavy corpus teaches `measuredFacts` a mention rate that would push
 * every generated draft to open with an @handle. Original posts are the thing being imitated.
 *
 * Meters exactly one `usage_events` row per call, matching the metering rule every other
 * acquisition path follows — stamped after success, so a thrown read meters nothing.
 */
export async function fetchUserTimeline(handle: string, ownerId: string): Promise<XTimelinePost[]> {
  const { id } = await resolveUserId(handle);

  const posts: XTimelinePost[] = [];
  let paginationToken: string | undefined;

  while (posts.length < MAX_POSTS) {
    const params = new URLSearchParams({
      max_results: String(Math.min(PAGE_SIZE, MAX_POSTS - posts.length + 5)),
      "tweet.fields": "created_at,public_metrics",
      exclude: "retweets,replies",
    });
    if (paginationToken) params.set("pagination_token", paginationToken);

    const res = await xGet(`/users/${id}/tweets?${params}`);
    const body = (await res.json()) as {
      data?: {
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: { like_count?: number; retweet_count?: number };
      }[];
      meta?: { next_token?: string };
    };
    if (!res.ok) {
      throw new Error(
        `X timeline read failed for @${handle}: HTTP ${res.status} — ${JSON.stringify(body).slice(0, 200)}`,
      );
    }

    for (const t of body.data ?? []) {
      if (!t.created_at) continue; // no timestamp = unusable for a chronological corpus
      posts.push({
        xPostId: t.id,
        text: t.text,
        postedAt: new Date(t.created_at).toISOString(),
        likeCount: t.public_metrics?.like_count ?? 0,
        repostCount: t.public_metrics?.retweet_count ?? 0,
      });
    }

    paginationToken = body.meta?.next_token;
    // No next page, or the page came back empty — the account simply has no more originals.
    if (!paginationToken || (body.data?.length ?? 0) === 0) break;
  }

  const trimmed = posts.slice(0, MAX_POSTS);

  const admin = createAdminClient();
  const { error } = await admin.from("usage_events").insert({
    owner_id: ownerId,
    kind: "x_timeline_read",
    units: trimmed.length,
    cost_usd: null, // within the project's monthly post cap — no per-record charge
    ref_id: handle,
  });
  if (error) console.error(`fetchUserTimeline: usage_events stamp failed for @${handle}`, error);

  return trimmed;
}
