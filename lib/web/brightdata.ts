// lib/web/brightdata.ts
//
// Raw-fetch Bright Data client (NOT the `bdata` CLI, NOT `@brightdata/sdk` — the
// no-vendor-SDK convention, matching lib/x/api.ts and lib/notify/*). Server-only: reads
// BRIGHTDATA_API_KEY and writes usage_events via the admin client. Never import this from a
// client component.
//
// Three endpoints, both/all live-verified against the real Bright Data account (G3,
// docs/.claude/rules/voice.md's extraction recipe):
//   - scrapeUrl     -> Web Unlocker, sync POST /request
//   - pullXTimeline -> Web Scraper API, X/Twitter posts dataset, async trigger/poll/download
//
// `fetchXProfile` (X PROFILE dataset, sync POST /datasets/v3/scrape) was DELETED, along with the
// extraction pre-flight gate it backed. Live probe, 2026-07-25: that endpoint answers a LIVE
// profile with `202 + snapshot_id` — queued, go poll — not with inline data. The gate read 202 as
// a rejection, so it failed @FabrizioRomano exactly as it failed a dead handle, blocking every
// extraction in the product and charging ~1c per attempt to do it. Do not resurrect it against
// the sync endpoint; if a profile pre-check is ever wanted again it has to run the same
// trigger/poll/download cycle pullXTimeline does, and the corpus pull already answers the only
// question it was asked ("does this handle have a timeline?") for free.
//
// Metering (L7 house rule, AGENTS.md): every call stamps exactly one usage_events row via the
// service-role admin client (the table has no insert policy — service role is mandatory).
// NEVER a model_calls row — these are not LLM calls. Stamped only after a successful
// fetch/pull: the interface contract is "throws on failure", and every existing
// stampUsageEvent call site in the codebase (draft-pipeline.ts) records post-success, not
// pre-attempt — a thrown scrapeUrl/pullXTimeline call meters nothing, matching that precedent.

import { createAdminClient } from "@/lib/supabase/admin";

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

/** Thrown by `bdFetch` on wall-clock expiry. A distinct CLASS rather than a message-shaped
 *  `Error` so a caller can tell "Bright Data never answered" from "the network refused us"
 *  without string-matching a message that any future edit could reword. Both callers
 *  (scrapeUrl/pullXTimeline) rethrow it untouched — it is still an `Error` carrying the same
 *  message they always propagated. */
export class BrightDataTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`Bright Data ${label} timed out after ${timeoutMs / 1000}s`);
    this.name = "BrightDataTimeoutError";
  }
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
      throw new BrightDataTimeoutError(label, timeoutMs);
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
 *  error code, never text in the body (G3 live finding, docs/.claude/rules/voice.md's extraction recipe). Any non-200 is
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
// Every caller of pullXTimeline today runs inside a route with maxDuration = 300 (create-desk's
// after() call, the Voice tab's manual retry) sharing that budget with
// extractVoiceGuideStreaming's own timeout and the DB writes around both — this ceiling was
// never revisited when extraction gained a live in-app calling path (it predates that; the old
// 10-minute value was sized for scripts/extract-voice-guide.ts's script-only context, which has
// no such cap). 100s is a first-pass budget split with extractVoiceGuideStreaming's own
// EXTRACT_TIMEOUT_MS, not measured against real production latency yet — retune both once real
// extraction runs show actual corpus-fetch vs. LLM-call durations. A poll that times out here
// still throws (caught by runExtractionSpendPhase, which stamps the run row as failed)
// instead of the function being killed mid-poll with no cleanup at all.
const POLL_TIMEOUT_MS = 100_000;

export type XTimelinePost = { xPostId: string; text: string; postedAt: string /* ISO */ };

/** Raw row shape confirmed by a live probe against the real dataset (gd_lwxkxvnf1cynvib9co,
 *  discover-by-profile-url mode) — many more fields exist (engagement counts, media, profile
 *  metadata); only the three consumed here are typed. */
type BrightDataXPost = { id: string; description: string | null; date_posted: string };

type TriggerResponse = { snapshot_id: string };
type ProgressResponse = { status: "starting" | "running" | "ready" | "failed" };

/** Casing is passed through DELIBERATELY — x.com resolves `/ReshadRahman` and `/reshadrahman`
 *  to the same profile, so lowercasing here bought nothing and made the request URL disagree
 *  with what the reporter actually typed (which is what a log reader compares against when a
 *  pre-flight fails). Only the leading `@` and surrounding whitespace are stripped, since those
 *  genuinely would produce a 404. `normalizeHandle` no longer lowercases at storage either — the
 *  unique keys that once made two casings bill as two reporters are gone. */
function xProfileUrl(handle: string): string {
  return `https://x.com/${handle.trim().replace(/^@/, "")}`;
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
