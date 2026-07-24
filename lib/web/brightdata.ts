// lib/web/brightdata.ts
//
// Raw-fetch Bright Data client (NOT the `bdata` CLI, NOT `@brightdata/sdk` — the
// no-vendor-SDK convention, matching lib/x/api.ts and lib/notify/*). Server-only: reads
// BRIGHTDATA_API_KEY and writes usage_events via the admin client. Never import this from a
// client component.
//
// Three endpoints, both/all live-verified against the real Bright Data account (G3,
// docs/decisions.md L2):
//   - scrapeUrl     -> Web Unlocker, sync POST /request
//   - pullXTimeline -> Web Scraper API, X/Twitter posts dataset, async trigger/poll/download
//   - fetchXProfile -> Web Scraper API, X/Twitter PROFILE dataset (a distinct, smaller
//     dataset_id from pullXTimeline's posts one), sync POST /datasets/v3/scrape — a cheap
//     pre-flight, not a data dependency, so unlike the two above it never throws on a failure
//     to resolve; see its own comment below for why.
//
// Metering (L7 house rule, AGENTS.md): every call stamps exactly one usage_events row via the
// service-role admin client (the table has no insert policy — service role is mandatory).
// NEVER a model_calls row — these are not LLM calls. Stamped only after a successful
// fetch/pull: the interface contract is "throws on failure", and every existing
// stampUsageEvent call site in the codebase (draft-pipeline.ts) records post-success, not
// pre-attempt — a thrown scrapeUrl/pullXTimeline call meters nothing, matching that precedent.

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeHandle } from "@/lib/x/handle";

type AdminClient = ReturnType<typeof createAdminClient>;

async function stampUsageEvent(
  admin: AdminClient,
  row: { owner_id: string; kind: string; units: number; cost_usd: number | null; ref_id: string },
): Promise<void> {
  const { error } = await admin.from("usage_events").insert(row);
  if (error) throw error;
}

function brightDataApiKey(): string {
  const key = process.env.BRIGHTDATA_API_KEY;
  if (!key) throw new Error("BRIGHTDATA_API_KEY is not set");
  return key;
}

/** `fetch` with a hard wall-clock timeout (lib/x/api.ts's xFetch / lib/agent/xai.ts's
 *  callResponses pattern) so a stalled Bright Data call fails fast instead of hanging. */
async function bdFetch(
  label: string,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(`Bright Data ${label} timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------------------------
// scrapeUrl — Web Unlocker, sync
// ---------------------------------------------------------------------------------------------

const UNLOCKER_URL = "https://api.brightdata.com/request";
const UNLOCKER_ZONE = "sdk_unlocker";

/** `text` = markdown, not raw HTML: `data_format: "markdown"` is the choice here — the
 *  downstream callers (T3.1's test-fetch action rendering a preview; Wave 2's
 *  lib/voice/corpus.ts feeding a voice-extraction prompt) both want clean readable text with
 *  the least post-processing, not a DOM to re-parse. */
export type ScrapeResult = { url: string; text: string };

/** Block-page detection is STATUS-CODE based, not body-marker sniffing — Bright Data's
 *  Unlocker resolves CAPTCHAs/blocks server-side, so a genuine failure surfaces as an HTTP
 *  error code, never text in the body (G3 live finding, docs/decisions.md L2). Any non-200 is
 *  a failed scrape. */
async function assertUnlockerOk(url: string, res: Response): Promise<void> {
  if (res.ok) return;
  const reason: Record<number, string> = {
    401: "bad request / missing headers",
    403: "forbidden",
    404: "dead or invalid URL",
    407: "bad zone credentials",
    429: "rate limited",
    502: "Unlocker failure (check x-luminati-error-code)",
    503: "browser-check failed/incomplete",
  };
  const luminatiErrorCode = res.headers.get("x-luminati-error-code");
  const text = await res.text();
  throw new Error(
    `Bright Data scrapeUrl(${url}) failed: ${res.status}` +
      ` (${reason[res.status] ?? "unexpected status"})` +
      (luminatiErrorCode ? ` [x-luminati-error-code=${luminatiErrorCode}]` : "") +
      ` — ${text.slice(0, 300)}`,
  );
}

/** Fetch + verify only — throws on failure, callers decide their own fallback. `render: true`
 *  is a reasonable default for a worker polling varied news sites that may need JS. */
export async function scrapeUrl(url: string, ownerId: string): Promise<ScrapeResult> {
  const apiKey = brightDataApiKey();
  const res = await bdFetch(
    "scrapeUrl",
    UNLOCKER_URL,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        zone: UNLOCKER_ZONE,
        url,
        format: "raw",
        data_format: "markdown",
        render: true,
      }),
    },
    30_000,
  );
  await assertUnlockerOk(url, res);
  const text = await res.text();

  const admin = createAdminClient();
  await stampUsageEvent(admin, {
    owner_id: ownerId,
    kind: "scrape_web",
    units: 1,
    cost_usd: null,
    ref_id: url,
  });

  return { url, text };
}

// ---------------------------------------------------------------------------------------------
// pullXTimeline — Web Scraper API, X/Twitter posts dataset, async trigger/poll/download
// ---------------------------------------------------------------------------------------------

const X_POSTS_DATASET_ID = "gd_lwxkxvnf1cynvib9co";
const DATASETS_TRIGGER_URL = "https://api.brightdata.com/datasets/v3/trigger";
const DATASETS_PROGRESS_URL = "https://api.brightdata.com/datasets/v3/progress";
const DATASETS_SNAPSHOT_URL = "https://api.brightdata.com/datasets/v3/snapshot";

const MAX_POSTS = 100;
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // a ~100-post discovery pull can run several minutes

export type XTimelinePost = { xPostId: string; text: string; postedAt: string /* ISO */ };

/** Raw row shape confirmed by a live probe against the real dataset (gd_lwxkxvnf1cynvib9co,
 *  discover-by-profile-url mode) — many more fields exist (engagement counts, media, profile
 *  metadata); only the three consumed here are typed. */
type BrightDataXPost = { id: string; description: string | null; date_posted: string };

type TriggerResponse = { snapshot_id: string };
type ProgressResponse = { status: "starting" | "running" | "ready" | "failed" };

function xProfileUrl(handle: string): string {
  return `https://x.com/${normalizeHandle(handle)}`;
}

/** Trigger the async discovery job. Plain PDP-style `{ url }` against this dataset_id (the
 *  plan/G3's assumed shape) rejects a profile URL — live-probed 2026-07-23: it validates the
 *  input against a single-post `/status/\d+` URL pattern unless the trigger is put into
 *  discovery mode via `type=discover_new&discover_by=profile_url` query params, which accepts
 *  a profile URL and returns each of that profile's recent posts. `limit_per_input` (a query
 *  param, not a body field — a body-level `max_number_of_posts` 400s) is the count knob; there
 *  is no separate "discovery variant" dataset_id, it's the same id in a different mode. */
async function triggerXTimeline(apiKey: string, handle: string): Promise<string> {
  const url = new URL(DATASETS_TRIGGER_URL);
  url.searchParams.set("dataset_id", X_POSTS_DATASET_ID);
  url.searchParams.set("format", "json");
  url.searchParams.set("type", "discover_new");
  url.searchParams.set("discover_by", "profile_url");
  url.searchParams.set("limit_per_input", String(MAX_POSTS));

  const res = await bdFetch(
    "pullXTimeline:trigger",
    url.toString(),
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify([{ url: xProfileUrl(handle) }]),
    },
    30_000,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Bright Data pullXTimeline(${handle}) trigger failed: ${res.status} — ${text.slice(0, 300)}`,
    );
  }
  const json = (await res.json()) as TriggerResponse;
  if (!json.snapshot_id)
    throw new Error(`Bright Data pullXTimeline(${handle}) trigger returned no snapshot_id`);
  return json.snapshot_id;
}

/** Polls `/datasets/v3/progress/{snapshot_id}` until `ready`/`failed`, bounded by
 *  POLL_TIMEOUT_MS so a stuck job fails loudly instead of hanging the caller forever. */
async function awaitSnapshotReady(
  apiKey: string,
  handle: string,
  snapshotId: string,
): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (true) {
    const res = await bdFetch(
      "pullXTimeline:progress",
      `${DATASETS_PROGRESS_URL}/${snapshotId}`,
      { headers: { authorization: `Bearer ${apiKey}` } },
      30_000,
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Bright Data pullXTimeline(${handle}) progress failed: ${res.status} — ${text.slice(0, 300)}`,
      );
    }
    const progress = (await res.json()) as ProgressResponse;
    if (progress.status === "ready") return;
    if (progress.status === "failed") {
      throw new Error(`Bright Data pullXTimeline(${handle}) snapshot ${snapshotId} failed`);
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Bright Data pullXTimeline(${handle}) snapshot ${snapshotId} did not become ready within ${POLL_TIMEOUT_MS / 1000}s`,
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

async function downloadSnapshot(
  apiKey: string,
  handle: string,
  snapshotId: string,
): Promise<BrightDataXPost[]> {
  const res = await bdFetch(
    "pullXTimeline:download",
    `${DATASETS_SNAPSHOT_URL}/${snapshotId}?format=json`,
    { headers: { authorization: `Bearer ${apiKey}` } },
    60_000,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Bright Data pullXTimeline(${handle}) download failed: ${res.status} — ${text.slice(0, 300)}`,
    );
  }
  return (await res.json()) as BrightDataXPost[];
}

/** Up to ~100 most recent posts, newest-first. The dataset's own delivery order is NOT
 *  reliably recency order — live-probed 2026-07-23: a 4-post pull for one profile came back
 *  17:11:17, 17:11:18, 20:39:06, 19:43:04 (arrival/crawl order, not sorted either direction) —
 *  so this always re-sorts by `date_posted` descending rather than trusting the API's order. */
export async function pullXTimeline(handle: string, ownerId: string): Promise<XTimelinePost[]> {
  const apiKey = brightDataApiKey();
  const snapshotId = await triggerXTimeline(apiKey, handle);
  await awaitSnapshotReady(apiKey, handle, snapshotId);
  const rows = await downloadSnapshot(apiKey, handle, snapshotId);

  const posts: XTimelinePost[] = rows
    .map((row) => ({ xPostId: row.id, text: row.description ?? "", postedAt: row.date_posted }))
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, MAX_POSTS);

  const admin = createAdminClient();
  await stampUsageEvent(admin, {
    owner_id: ownerId,
    kind: "scrape_x_timeline",
    units: 1,
    cost_usd: null,
    ref_id: handle,
  });

  return posts;
}

// ---------------------------------------------------------------------------------------------
// fetchXProfile — Web Scraper API, X/Twitter PROFILE dataset, sync (a pre-flight, not a data
// dependency — see the return-contract note below)
// ---------------------------------------------------------------------------------------------

/** "Collect X (Twitter) profiles by URL" — a distinct, smaller dataset from X_POSTS_DATASET_ID
 *  above (docs: api-reference/scrapers/social-media-apis/twitter-profiles-collect-by-url,
 *  confirmed 2026-07-24). Resolves through the same `/datasets/v3/scrape` sync endpoint
 *  pullXTimeline's trigger/progress/download cycle exists to avoid: up to 20 URLs, data back
 *  inline within ~1 minute, no snapshot polling — the right shape for a single-handle
 *  pre-flight ahead of any extraction spend claim. */
const X_PROFILE_DATASET_ID = "gd_lwxmeb2u1cniijd7t4";
const DATASETS_SCRAPE_URL = "https://api.brightdata.com/datasets/v3/scrape";

/** Only `posts_count` is consumed — the live response carries far more (bio, followers,
 *  is_verified, profile_image_link, recent posts, ...), all ignored here. */
type BrightDataXProfile = { posts_count?: number };

export type XProfileResult = { resolved: boolean; postsCount: number };

/** Return contract is deliberately NOT "throws on failure" like scrapeUrl/pullXTimeline above —
 *  this is a pre-flight probe a caller branches on, not a data dependency it needs to succeed.
 *  Bright Data has no stable enum distinguishing a private/suspended/nonexistent/malformed
 *  handle (docs researched, no `error_message` taxonomy to branch on), so every non-resolving
 *  outcome — network/timeout error, non-2xx, a 202 (the sync endpoint's own async-fallback
 *  signal, deliberately not chased into pullXTimeline's poll/download cycle for a single
 *  handle), an empty/malformed body, a missing or non-numeric `posts_count` — collapses into
 *  the same `{ resolved: false, postsCount: 0 }`. Only a config error (missing
 *  BRIGHTDATA_API_KEY) still throws, same as every other function in this file. Meters
 *  `usage_events` on every attempt, success or failure: Bright Data bills a failed-due-to-
 *  invalid-input row the same as a successful one, so unlike scrapeUrl/pullXTimeline's
 *  post-success-only stamp, this one meters unconditionally once a request was actually
 *  attempted. */
export async function fetchXProfile(handle: string, ownerId: string): Promise<XProfileResult> {
  const apiKey = brightDataApiKey();
  const url = new URL(DATASETS_SCRAPE_URL);
  url.searchParams.set("dataset_id", X_PROFILE_DATASET_ID);
  url.searchParams.set("format", "json");

  let result: XProfileResult = { resolved: false, postsCount: 0 };
  try {
    const res = await bdFetch(
      "fetchXProfile",
      url.toString(),
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ input: [{ url: xProfileUrl(handle) }] }),
      },
      60_000,
    );
    if (res.status === 200) {
      const rows = (await res.json()) as BrightDataXProfile[];
      const postsCount = Array.isArray(rows) ? rows[0]?.posts_count : undefined;
      if (typeof postsCount === "number" && Number.isFinite(postsCount)) {
        result = { resolved: true, postsCount };
      }
    }
  } catch {
    // network error, timeout, or a malformed body — collapses into the unresolved result below
  }

  const admin = createAdminClient();
  await stampUsageEvent(admin, {
    owner_id: ownerId,
    kind: "scrape_x_profile",
    units: 1,
    cost_usd: null,
    ref_id: handle,
  });

  return result;
}
