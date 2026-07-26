// Slack interactive-button webhook — POST /api/slack/interactions. Slack requires a 200
// within 3 seconds of delivering the payload (live-verified against Slack's docs), so this route verifies
// the raw-body signature synchronously and responds 200 immediately once that passes, then
// runs the idempotency claim + the actual X post + the Slack follow-up in `after()` (same
// ack-fast-then-do-the-slow-work pattern as app/agents/new/actions.ts's post-response
// extraction trigger) — `postDraftToXForOwner` calls X's API and is not guaranteed to finish
// inside Slack's deadline. Node runtime (default — no `runtime = "edge"`); `maxDuration = 300`
// names the ceiling for the whole invocation even though the synchronous handler itself
// returns almost instantly — the network-bound work runs in `after()`, under the same
// function invocation, per this repo's Vercel conventions.
//
// No user session exists on this route — every DB read/write here uses the admin
// (service-role) client, same as app/api/ingest/route.ts. All business logic (claiming,
// posting to X) is delegated to lib/slack/store.ts and lib/x/actions.ts — never duplicated
// here.

import { after } from "next/server";
import { z } from "zod";
import { postMessage, SLACK_POST_TO_X_ACTION_ID, verifySlackSignature } from "@/lib/slack/api";
import { claimDeliveryReceipt, getSlackAccount } from "@/lib/slack/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { postDraftToXForOwner } from "@/lib/x/post-core";

export const maxDuration = 300;

// The only interaction shape this app's single Block Kit button produces (`SLACK_POST_TO_X_ACTION_ID`,
// buildDraftBlocks() in lib/slack/api.ts). `trigger_id` is Slack's own per-interaction
// identifier — freshly issued on every actual button click, not on a message render — so it
// doubles as the idempotency key a redelivery of the SAME click would repeat unchanged.
// `user.id` is the Slack member who actually clicked — Slack sends it on every block_actions
// payload; see the authorization note in handleInteraction() for what it is and isn't used for.
const blockActionsPayloadSchema = z.object({
  type: z.literal("block_actions"),
  trigger_id: z.string().min(1),
  actions: z.array(z.object({ action_id: z.string(), value: z.string() })).min(1),
  team: z.object({ id: z.string().min(1) }),
  channel: z.object({ id: z.string().min(1) }),
  user: z.object({ id: z.string().min(1) }),
});

// The button's `value` is the `post_drafts.id` buildDraftBlocks() stamped into it. Validated
// as a UUID before it reaches the admin-scoped lookup below, mirroring what
// lib/x/actions.ts's `postDraftToX` does with the browser-supplied id: a malformed value is
// rejected at the edge rather than handed to the DB as garbage input.
const postDraftIdSchema = z.string().uuid();

function parseInteractionPayload(
  rawBody: string,
): z.infer<typeof blockActionsPayloadSchema> | null {
  const form = new URLSearchParams(rawBody);
  const payloadField = form.get("payload");
  if (!payloadField) return null;

  let json: unknown;
  try {
    json = JSON.parse(payloadField);
  } catch {
    return null;
  }

  const parsed = blockActionsPayloadSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** The slow leg, run in `after()` once the 200 ack is already on the wire: atomic idempotency
 *  claim, act via the same session-independent core the Feed's own X-post action delegates
 *  to, then a plain-text follow-up message reporting the outcome back into the same channel. */
async function handleInteraction(input: {
  interactionId: string;
  postDraftId: string;
  teamId: string;
  channelId: string;
  slackUserId: string;
}): Promise<void> {
  const { interactionId, postDraftId, teamId, channelId, slackUserId } = input;
  const admin = createAdminClient();

  const { data: draft, error } = await admin
    .from("post_drafts")
    .select("experiment_id, experiments(owner_id)")
    .eq("id", postDraftId)
    .maybeSingle();
  if (error || !draft) {
    console.error("api/slack/interactions: draft not found", postDraftId, error);
    return;
  }

  const experimentId = draft.experiment_id;
  const ownerId = draft.experiments?.owner_id;
  if (!ownerId) {
    console.error("api/slack/interactions: draft has no resolvable owner", postDraftId);
    return;
  }

  // The HMAC only proves this request came from Slack for SOME installation of this app —
  // Slack's signing secret is shared app-wide, not per-workspace-install, so it doesn't prove
  // the click came from the desk that actually owns this draft. Bind it here instead: the
  // interaction's own team/channel must match the draft's desk's linked slack_accounts row.
  const account = await getSlackAccount(experimentId);
  if (!account) return; // Slack got disconnected between the click and now — nowhere to reply.
  if (account.team_id !== teamId || account.channel_id !== channelId) {
    console.error("api/slack/interactions: team/channel mismatch for draft", postDraftId, {
      expected: { team: account.team_id, channel: account.channel_id },
      got: { teamId, channelId },
    });
    return;
  }

  // WHO may click, deliberately: any member of the linked channel, not a single Slack person.
  // `slack_accounts` records the INSTALL (team/channel/bot/token) and no human identity at all —
  // there is no `authed_user_id` column, and `bot_user_id` is this app's bot, not the installer —
  // so there is nothing stored to compare `slackUserId` against. The channel IS the boundary the
  // desk owner chose: they installed this app to it and control who is in it. `slackUserId` is
  // therefore recorded, not enforced — every publish leaves an audit trail of who clicked, which
  // is what makes a later per-user policy (a stored installer id, or an allowlist) a real change
  // rather than a guess. Do NOT treat this line as authorization; the team/channel bind above is.
  console.log("api/slack/interactions: post_to_x clicked", {
    postDraftId,
    experimentId,
    slackUserId,
    teamId,
    channelId,
  });

  const claimed = await claimDeliveryReceipt(interactionId, experimentId);
  if (!claimed) return; // Slack redelivered this exact click — idempotency, not an error.

  const result = await postDraftToXForOwner(postDraftId, ownerId);
  console.log("api/slack/interactions: post_to_x outcome", {
    postDraftId,
    slackUserId,
    ok: result.ok,
  });

  const text = result.ok ? `Posted to X: ${result.url}` : `Couldn't post to X: ${result.error}`;
  try {
    await postMessage({ channelId: account.channel_id, accessToken: account.access_token, text });
  } catch (err) {
    console.error("api/slack/interactions: follow-up message failed", err);
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  if (!verifySlackSignature(rawBody, req.headers)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Only AFTER verification succeeds is the raw body form-decoded — Slack's actual POST body
  // is application/x-www-form-urlencoded wrapping a payload=<json> field, not raw JSON.
  const payload = parseInteractionPayload(rawBody);
  const action = payload?.actions[0];

  if (!payload || !action || action.action_id !== SLACK_POST_TO_X_ACTION_ID) {
    // A future button type, or a malformed payload — nothing actionable. Slack's own retry
    // behavior on a non-200 is aggressive, so ack cleanly rather than error the response.
    console.error("api/slack/interactions: unrecognized payload", payload ?? rawBody.slice(0, 500));
    return new Response(null, { status: 200 });
  }

  // A `value` that isn't a draft id can only come from a forged or corrupted payload — it is
  // never something a retry fixes, so it acks 200 (a non-200 only buys Slack's retry storm)
  // and stops here rather than reaching the admin-scoped post_drafts lookup.
  const parsedDraftId = postDraftIdSchema.safeParse(action.value);
  if (!parsedDraftId.success) {
    console.error("api/slack/interactions: action value is not a draft id", {
      value: action.value.slice(0, 100),
      teamId: payload.team.id,
      channelId: payload.channel.id,
      slackUserId: payload.user.id,
    });
    return new Response(null, { status: 200 });
  }

  // Ack within Slack's 3s deadline: respond now, do the claim + act + follow-up after.
  after(() =>
    handleInteraction({
      interactionId: payload.trigger_id,
      postDraftId: parsedDraftId.data,
      teamId: payload.team.id,
      channelId: payload.channel.id,
      slackUserId: payload.user.id,
    }),
  );

  return new Response(null, { status: 200 });
}
