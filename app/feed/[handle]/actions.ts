"use server";

// app/feed/[handle]/actions.ts
//
// Server actions behind the PUBLIC feed page: pagination for the infinite scroll, and the
// authorize flow that puts a desk's pilot person into the DM loop. Everything runs on the
// admin client, this page has no session, and every send is reserved through the
// reserve_dm_send ledger before the bot speaks.

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { fetchPublicAgent, fetchPublicFeed, type PublicFeedStory } from "@/lib/feed/public-query";
import { captureServerEvent, reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BotSendError, botConfigured, sendBotDm } from "@/lib/x/bot";
import { resolveXUserIds } from "@/lib/x/handle-check";

export type FetchMoreResult =
  | { stories: PublicFeedStory[]; nextBefore: string | null }
  | { error: string };

export type AuthorizeResult = {
  state: "pending" | "active" | "trial_expired" | "error";
  fallbackComposeUrl?: string;
  error?: string;
};

/** Best-effort per-IP limit: 10 authorize attempts an hour, tracked per serverless instance.
 *  A fresh instance forgets the window, acceptable for an abuse speed bump, not a cap story. */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 3_600_000;
const rateWindows = new Map<string, { count: number; windowStart: number }>();

async function requestIpHash(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for") ?? "unknown";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

function rateLimited(ipHash: string): boolean {
  const now = Date.now();
  if (rateWindows.size > 10_000) rateWindows.clear();
  const entry = rateWindows.get(ipHash);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateWindows.set(ipHash, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

/** The composer deep link a stuck person can always use to send the "yes" themselves.
 *  Null when the bot's user id is not in the env, there is nobody to compose to. */
function composeUrl(): string | null {
  const botId = process.env.X_BOT_USER_ID;
  return botId ? `https://x.com/messages/compose?recipient_id=${botId}&text=yes` : null;
}

export async function fetchMoreStories(handle: string, before: string): Promise<FetchMoreResult> {
  if (typeof before !== "string" || Number.isNaN(Date.parse(before))) {
    return { error: "Invalid cursor." };
  }
  try {
    const data = await fetchPublicFeed(createAdminClient(), handle, { before });
    if (!data) return { error: "No feed exists for this handle." };
    return { stories: data.stories, nextBefore: data.nextBefore };
  } catch (error) {
    reportServerException(error, { tags: { area: "public_feed" } });
    return { error: "Couldn't load older stories." };
  }
}

export async function requestDmAuthorization(handle: string): Promise<AuthorizeResult> {
  const admin = createAdminClient();

  // a. The desk must exist.
  let agent: Awaited<ReturnType<typeof fetchPublicAgent>>;
  try {
    agent = await fetchPublicAgent(admin, handle);
  } catch (error) {
    reportServerException(error, { tags: { area: "dm_intake" } });
    return { state: "error", error: "Something went wrong. Try again." };
  }
  if (!agent) return { state: "error", error: "No feed exists for this handle." };

  // b. Best-effort per-IP rate limit.
  try {
    if (rateLimited(await requestIpHash())) {
      return { state: "error", error: "Too many attempts. Try again later." };
    }
  } catch {
    // Headers unavailable: skip the best-effort limit rather than block the person.
  }

  const distinctId = `x:${agent.publicHandle.toLowerCase()}`;
  const fallbackComposeUrl = composeUrl();
  const withFallback = (result: AuthorizeResult): AuthorizeResult =>
    fallbackComposeUrl ? { ...result, fallbackComposeUrl } : result;

  try {
    // c. An existing connection short-circuits: pending is idempotent (no second DM), active
    //    and trial_expired report themselves, stopped falls through to re-authorize.
    const { data: existing, error: existingError } = await admin
      .from("dm_connections")
      .select("id, state")
      .eq("agent_id", agent.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.state === "pending") return withFallback({ state: "pending" });
    if (existing?.state === "active") return { state: "active" };
    if (existing?.state === "trial_expired") return { state: "trial_expired" };

    // d. Resolve the pilot person's numeric X id through the shared handle cache.
    const { data: ownerRow, error: ownerError } = await admin
      .from("agents")
      .select("owner_id")
      .eq("id", agent.id)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (!ownerRow) return { state: "error", error: "No feed exists for this handle." };
    const resolved = await resolveXUserIds([agent.publicHandle], ownerRow.owner_id);
    const xUserId = resolved.get(agent.publicHandle.toLowerCase());
    if (!xUserId) return { state: "error", error: "We couldn't find that X account." };

    // e. The connection goes pending regardless of what the send later does, an inbound
    //    "yes" matches this row by sender id even when our own DM never left.
    if (existing) {
      const { error: updateError } = await admin
        .from("dm_connections")
        .update({
          state: "pending",
          x_user_id: xUserId,
          handle: agent.publicHandle,
          consent_at: null,
        })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await admin.from("dm_connections").insert({
        agent_id: agent.id,
        x_user_id: xUserId,
        handle: agent.publicHandle,
        state: "pending",
      });
      if (insertError) {
        if (insertError.code === "23505") {
          return { state: "error", error: "This account already has alerts on another feed." };
        }
        throw insertError;
      }
    }

    // f. No bot in the env: the pending row stands, the person composes the yes themselves.
    if (!botConfigured()) {
      return fallbackComposeUrl
        ? { state: "pending", fallbackComposeUrl }
        : { state: "pending", error: "Alerts are not live yet." };
    }

    // g. Reserve before sending, the ledger is the cap story.
    const { data: reservationId, error: reserveError } = await admin.rpc("reserve_dm_send", {
      p_purpose: "authorize",
      p_recipient: xUserId,
      p_agent_id: agent.id,
      p_idempotency_key: `authorize:${agent.id}:${crypto.randomUUID()}`,
    });
    if (reserveError) throw reserveError;
    if (!reservationId) {
      captureServerEvent("dm_authorize_send_failed", {
        distinctId,
        properties: { agent_id: agent.id, pilot_handle: agent.publicHandle, reason: "cap" },
      });
      return withFallback({ state: "pending" });
    }

    // h. One DM. A definite refusal releases the reservation; anything murkier leaves it for
    //    reconcile to finalize. Either way the pending row stays and the composer link is the
    //    person's way forward.
    const deskName = agent.name ?? agent.publicHandle;
    try {
      await sendBotDm({
        participantId: xUserId,
        text: `Reply yes and I'll start sending you ${deskName}'s breaking news. Reply stop at any time.`,
      });
    } catch (sendError) {
      const definite = sendError instanceof BotSendError;
      if (definite) {
        const { error: releaseError } = await admin
          .from("dm_send_ledger")
          .delete()
          .eq("id", reservationId)
          .eq("state", "reserved");
        if (releaseError) reportServerException(releaseError, { tags: { area: "dm_intake" } });
      }
      captureServerEvent("dm_authorize_send_failed", {
        distinctId,
        properties: {
          agent_id: agent.id,
          pilot_handle: agent.publicHandle,
          reason: definite ? "refused" : "unknown",
        },
      });
      reportServerException(sendError, { tags: { area: "dm_intake" } });
      return withFallback({ state: "pending" });
    }

    const { error: finalizeError } = await admin
      .from("dm_send_ledger")
      .update({ state: "sent", sent_at: new Date().toISOString() })
      .eq("id", reservationId);
    if (finalizeError) reportServerException(finalizeError, { tags: { area: "dm_intake" } });

    captureServerEvent("dm_authorize_sent", {
      distinctId,
      properties: { agent_id: agent.id, pilot_handle: agent.publicHandle },
      set: { handle: agent.publicHandle, cohort: "pilot" },
    });
    return { state: "pending" };
  } catch (error) {
    reportServerException(error, { tags: { area: "dm_intake" } });
    return { state: "error", error: "Something went wrong. Try again." };
  }
}
