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
 *  `Error` so `fetchXProfile`'s failure taxonomy can tell "Bright Data never answered" from
 *  "the network refused us" without string-matching a message that any future edit could
 *  reword. The other two callers (scrapeUrl/pullXTimeline) rethrow it untouched — it is still
 *  an `Error` with the same message they always propagated. */
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
// after() call, the Voice tab's manual retry) sharing that budget with fetchXProfile's pre-flight,
// extractVoiceGuideStreaming's own timeout, and the DB writes around both — this ceiling was
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

/** Why a pre-flight didn't resolve. Every one of these used to collapse into a single
 *  `{ resolved: false }` with an empty `catch {}` — a bad API key, a timeout, a 404, a rate
 *  limit and a malformed body were indistinguishable even in the server logs, which is what
 *  made a failed extraction undiagnosable. Bright Data still has no `error_message` taxonomy of
 *  its own to branch on (docs researched), so these are derived from the transport: the HTTP
 *  status, the exception type, and the shape of the body. That is enough to tell an OUR-FAULT
 *  failure (auth/timeout/5xx — retry, alert us) from a THEIR-HANDLE failure (`not_found`,
 *  `no_posts`) the reporter can actually act on. */
export type XProfileFailure =
  | "timeout"
  | "network"
  | "auth"
  | "rate_limited"
  | "not_found"
  | "async_fallback"
  | "server_error"
  | "bad_request"
  | "malformed_body"
  | "no_profile_returned"
  | "no_posts";

/** Reporter-facing sentence per failure. Lives here, beside the taxonomy it describes, so a new
 *  variant cannot be added without deciding what the reporter is told — the pairing that
 *  `Record<XProfileFailure, string>` makes a compile error rather than a silent gap. */
export const X_PROFILE_FAILURE_COPY: Record<XProfileFailure, string> = {
  timeout: "The profile lookup timed out before X answered.",
  network: "Couldn't reach the profile lookup service.",
  auth: "The profile lookup service rejected our credentials.",
  rate_limited: "The profile lookup service is rate limiting us right now.",
  not_found: "No X profile exists at that handle.",
  async_fallback: "The profile lookup was queued instead of answered — try again.",
  server_error: "The profile lookup service had an internal error.",
  bad_request: "The profile lookup was rejected as malformed.",
  malformed_body: "The profile lookup returned something we couldn't read.",
  no_profile_returned: "The lookup succeeded but returned no profile for that handle.",
  no_posts: "That profile exists but has no public posts to learn from.",
};

/** Discriminated so a caller cannot read `postsCount` off a failure and treat 0 as real data —
 *  the old `{ resolved: boolean; postsCount: number }` shape allowed exactly that. */
export type XProfileResult =
  | { resolved: true; postsCount: number }
  | { resolved: false; postsCount: 0; failure: XProfileFailure; detail: string | null };

/** Maps a non-2xx response to its failure variant. 202 is the sync endpoint's own
 *  async-fallback signal — deliberately NOT chased into pullXTimeline's poll/download cycle for
 *  a single handle, so it is reported as its own retryable outcome rather than an error. */
function profileFailureForStatus(status: number): XProfileFailure {
  if (status === 202) return "async_fallback";
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "bad_request";
}

/** Return contract is deliberately NOT "throws on failure" like scrapeUrl/pullXTimeline above —
 *  this is a pre-flight probe a caller branches on, not a data dependency it needs to succeed.
 *  Only a config error (missing BRIGHTDATA_API_KEY) still throws, same as every other function
 *  in this file.
 *
 *  Every non-resolving outcome now carries a `failure` discriminant and a `detail` string
 *  instead of collapsing into one anonymous `{ resolved: false }`. That collapse was a real
 *  defect, not a stylistic one: a live extraction failed at this exact call and the cause could
 *  not be recovered afterwards from the database OR the logs, because a bad API key, a timeout,
 *  a 404, a rate limit and a malformed body all produced byte-identical evidence. The taxonomy
 *  is derived from the transport (status / exception class / body shape) since Bright Data
 *  exposes no error enum of its own here.
 *
 *  `postsCount === 0` is folded in as the `no_posts` failure rather than left as a "resolved"
 *  result the caller has to re-test — every caller treated it as a rejection anyway, and as a
 *  failure variant it gets a reporter-facing sentence like the rest.
 *
 *  Meters `usage_events` on every attempt, success or failure: Bright Data bills a
 *  failed-due-to-invalid-input row the same as a successful one, so unlike scrapeUrl/
 *  pullXTimeline's post-success-only stamp, this one meters unconditionally once a request was
 *  actually attempted. That unconditional stamp is also what `checkPreflightCap` counts. */
export async function fetchXProfile(handle: string, ownerId: string): Promise<XProfileResult> {
  const apiKey = brightDataApiKey();
  const url = new URL(DATASETS_SCRAPE_URL);
  url.searchParams.set("dataset_id", X_PROFILE_DATASET_ID);
  url.searchParams.set("format", "json");

  const profileUrl = xProfileUrl(handle);
  let result: XProfileResult;

  try {
    const res = await bdFetch(
      "fetchXProfile",
      url.toString(),
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ input: [{ url: profileUrl }] }),
      },
      60_000,
    );

    if (res.status !== 200) {
      // The body is read for the log/detail only — Bright Data returns no machine-readable
      // error code here, so the raw text is the single most useful diagnostic we can keep.
      const text = await res.text().catch(() => "");
      result = {
        resolved: false,
        postsCount: 0,
        failure: profileFailureForStatus(res.status),
        detail: `HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`,
      };
    } else {
      let rows: BrightDataXProfile[] | null = null;
      try {
        rows = (await res.json()) as BrightDataXProfile[];
      } catch {
        rows = null;
      }

      if (!Array.isArray(rows)) {
        result = {
          resolved: false,
          postsCount: 0,
          failure: "malformed_body",
          detail: "200 response body was not a JSON array",
        };
      } else if (rows.length === 0) {
        // A 200 with an empty array is Bright Data's shape for "that URL resolved to nothing" —
        // the closest thing this endpoint has to a 404, and the likeliest signature of a handle
        // that is deleted, suspended, or simply misspelled.
        result = {
          resolved: false,
          postsCount: 0,
          failure: "no_profile_returned",
          detail: `no rows returned for ${profileUrl}`,
        };
      } else {
        const postsCount = rows[0]?.posts_count;
        if (typeof postsCount !== "number" || !Number.isFinite(postsCount)) {
          result = {
            resolved: false,
            postsCount: 0,
            failure: "malformed_body",
            detail: `profile row carried no numeric posts_count (got ${typeof postsCount})`,
          };
        } else if (postsCount === 0) {
          // Distinct from every failure above: the profile is REAL, it just has nothing to
          // learn a voice from. The reporter can act on this; the others they cannot.
          result = {
            resolved: false,
            postsCount: 0,
            failure: "no_posts",
            detail: `${profileUrl} resolved with posts_count = 0`,
          };
        } else {
          result = { resolved: true, postsCount };
        }
      }
    }
  } catch (err) {
    result = {
      resolved: false,
      postsCount: 0,
      failure: err instanceof BrightDataTimeoutError ? "timeout" : "network",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!result.resolved) {
    console.warn(
      `fetchXProfile(${handle}): ${result.failure} — ${result.detail ?? "no detail"} [${profileUrl}]`,
    );
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
