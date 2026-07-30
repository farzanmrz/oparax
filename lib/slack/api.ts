// lib/slack/api.ts
//
// Raw-fetch client for Slack's Web API + OAuth2 + request-signature verification (NOT an
// SDK dependency) — mirrors lib/x/api.ts's raw-fetch precedent: env read fail-fast,
// AbortSignal.timeout, non-OK -> Error with status + truncated body. Slack's Web API differs
// from X's in one important way: it returns HTTP 200 even on a logical failure, with
// `{ ok: false, error: "..." }` in the body — `assertOk` below only catches transport-level
// (non-2xx) failures, every caller must ALSO check the parsed `ok` field. Pure module: no
// Supabase, no Next.js, no React, no I/O beyond fetch/crypto.

import { createHmac, timingSafeEqual } from "node:crypto";

import { assertFetchOk, fetchWithTimeout } from "@/lib/http-fetch";

const SLACK_API = "https://slack.com/api";

/** `chat:write` is confirmed sufficient for posting Block Kit messages with buttons —
 *  interactivity itself is an app-config Request-URL toggle, not a separate OAuth scope
 *  (live-verified against Slack's docs). `incoming-webhook` is requested too so the OAuth install grant
 *  itself resolves a target channel (`incoming_webhook.channel_id`/`channel`) — chosen over
 *  building a custom post-install channel picker, since `slack_accounts.channel_id`/
 *  `channel_name` are NOT NULL and this is the only response shape that fills them for free
 *  at install time (see task-15-report.md). */
export const SLACK_SCOPES = "chat:write,incoming-webhook";

/** The interactive button's `action_id` — the interactions route (a later Wave 3 task) reads
 *  this back to know which action fired, and `value` carries the `drafts.id` it applies
 *  to. Exported so both sides of that contract import the same literal instead of duplicating
 *  the string (see task-15-report.md). */
export const SLACK_POST_TO_X_ACTION_ID = "post_to_x";

type SlackPostMessageResponse =
  | { ok: true; ts: string; channel: string }
  | { ok: false; error: string };

type SlackOAuthResponse =
  | {
      ok: true;
      access_token: string;
      bot_user_id: string;
      scope: string;
      team: { id: string; name: string };
      incoming_webhook?: {
        channel: string;
        channel_id: string;
        url: string;
        configuration_url: string;
      };
    }
  | { ok: false; error: string };

/** Runs `fetch`, hard-timing-out at 15s and rethrowing a clear Error on
 *  TimeoutError/AbortError (xai.ts / lib/x/api.ts pattern) so a stalled Slack call fails fast
 *  instead of hanging indefinitely. */
async function slackFetch(endpoint: string, url: string, init: RequestInit): Promise<Response> {
  return fetchWithTimeout("Slack", endpoint, url, init);
}

/** Transport-level check only — a non-2xx here means Slack itself failed to respond, NOT
 *  that the call failed logically. Every caller must additionally check the parsed body's
 *  `ok` field, which is how Slack actually signals a failed call. */
async function assertOk(endpoint: string, res: Response): Promise<void> {
  return assertFetchOk("Slack", endpoint, res);
}

/** Builds a draft-delivery message's Block Kit blocks: the draft text plus a single
 *  "Post to X" button carrying the draft's id as `value`. The Feed's draft card (read for
 *  this task) offers exactly one actionable next step on an unposted draft — Post to X — so
 *  there is no second button here; a later task can extend this if the card grows one. */
export function buildDraftBlocks(input: { text: string; draftId: string }): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: input.text },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Post to X", emoji: true },
          style: "primary",
          action_id: SLACK_POST_TO_X_ACTION_ID,
          value: input.draftId,
        },
      ],
    },
  ];
}

/** Raw fetch to `chat.postMessage`. Slack returns 200 even on failure — `ok` is checked
 *  explicitly, a non-2xx alone is NOT how Slack signals it. */
export async function postMessage(input: {
  channelId: string;
  accessToken: string;
  text: string;
  blocks?: unknown[];
}): Promise<{ ts: string }> {
  const res = await slackFetch("chat.postMessage", `${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({ channel: input.channelId, text: input.text, blocks: input.blocks }),
  });
  await assertOk("chat.postMessage", res);
  const json = (await res.json()) as SlackPostMessageResponse;
  if (!json.ok) throw new Error(`Slack chat.postMessage failed: ${json.error}`);
  return { ts: json.ts };
}

/** OAuth v2 code-for-token exchange (`oauth.v2.access`) for the OAuth callback route (Wave
 *  3). Requires the `incoming-webhook` scope to be present in the install grant — the
 *  callback route must request `SLACK_SCOPES` (not just `chat:write`) or this throws. */
export async function exchangeCodeForToken(params: { code: string; redirectUri: string }): Promise<{
  accessToken: string;
  botUserId: string;
  scopes: string;
  team: { id: string; name: string };
  channel: { id: string; name: string };
}> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SLACK_CLIENT_ID / SLACK_CLIENT_SECRET is not set");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
  });

  const res = await slackFetch("oauth.v2.access", `${SLACK_API}/oauth.v2.access`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  await assertOk("oauth.v2.access", res);
  const json = (await res.json()) as SlackOAuthResponse;
  if (!json.ok) throw new Error(`Slack oauth.v2.access failed: ${json.error}`);
  if (!json.incoming_webhook) {
    throw new Error(
      "Slack OAuth grant is missing incoming_webhook — was SLACK_SCOPES requested at install?",
    );
  }

  return {
    accessToken: json.access_token,
    botUserId: json.bot_user_id,
    scopes: json.scope,
    team: { id: json.team.id, name: json.team.name },
    // `incoming_webhook.channel` is Slack's display form ("#channel-name") — stripped to
    // match the bare name every other channel-name surface in this app expects.
    channel: {
      id: json.incoming_webhook.channel_id,
      name: json.incoming_webhook.channel.replace(/^#/, ""),
    },
  };
}

/** Verifies an inbound Slack request's `X-Slack-Signature` header against the raw request
 *  body. EXACT scheme (live-confirmed against Slack's own docs): base
 *  string `` `v0:${timestamp}:${rawBody}` ``, HMAC-SHA256 keyed by `SLACK_SIGNING_SECRET`,
 *  hex digest, compared as `` `v0=${digest}` `` via `crypto.timingSafeEqual` (length-checked
 *  first, same pattern as `app/api/ingest/route.ts`'s `isAuthorized`). Rejects a timestamp
 *  more than 300s (5 minutes) from now — Slack's documented replay window. Takes the raw
 *  body AS-IS: the interactions endpoint's actual POST body is
 *  `application/x-www-form-urlencoded` wrapping a `payload=<json>` field, not raw JSON, but
 *  this function does not know or care about that — whatever the raw body is, it is exactly
 *  what gets HMAC'd, and it is the caller's job (a later task) to form-decode only AFTER this
 *  returns true. */
export function verifySlackSignature(rawBody: string, headers: Headers): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  const timestamp = headers.get("x-slack-request-timestamp");
  const signature = headers.get("x-slack-signature");
  if (!timestamp || !signature) return false;

  const timestampSec = Number(timestamp);
  if (!Number.isFinite(timestampSec)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSec) > 300) return false;

  const digest = createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${rawBody}`)
    .digest("hex");
  const expected = Buffer.from(`v0=${digest}`);
  const actual = Buffer.from(signature);

  // timingSafeEqual throws on unequal lengths — check first rather than let a length
  // mismatch throw past the constant-time comparison.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
