// Slack interactive-button webhook — POST /api/slack/interactions. Slack requires a 200
// within 3 seconds of delivering the payload (G2, docs/decisions.md), so this route verifies
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
import { postDraftToXForOwner } from "@/lib/x/actions";

export const maxDuration = 300;

// The only interaction shape this app's single Block Kit button produces (`SLACK_POST_TO_X_ACTION_ID`,
// buildDraftBlocks() in lib/slack/api.ts). `trigger_id` is Slack's own per-interaction
// identifier — freshly issued on every actual button click, not on a message render — so it
// doubles as the idempotency key a redelivery of the SAME click would repeat unchanged.
const blockActionsPayloadSchema = z.object({
  type: z.literal("block_actions"),
  trigger_id: z.string().min(1),
  actions: z.array(z.object({ action_id: z.string(), value: z.string() })).min(1),
  team: z.object({ id: z.string().min(1) }),
  channel: z.object({ id: z.string().min(1) }),
});

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
async function handleInteraction(
  interactionId: string,
  postDraftId: string,
  teamId: string,
  channelId: string,
): Promise<void> {
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

  const claimed = await claimDeliveryReceipt(interactionId, experimentId);
  if (!claimed) return; // Slack redelivered this exact click — idempotency, not an error.

  const result = await postDraftToXForOwner(postDraftId, ownerId);

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

  // Ack within Slack's 3s deadline: respond now, do the claim + act + follow-up after.
  after(() =>
    handleInteraction(payload.trigger_id, action.value, payload.team.id, payload.channel.id),
  );

  return new Response(null, { status: 200 });
}
