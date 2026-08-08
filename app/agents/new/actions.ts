"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isOverrideOwner } from "@/lib/owner-allowlist";
import {
  markPendingSourceFailed,
  onboardSource,
  reservePendingSource,
  SONNET_ONBOARDING_MODEL,
} from "@/lib/sources/onboard-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_WEBSITES, normalizeSourceUrl } from "@/lib/websites";
import { MAX_TRACKED_HANDLES, normalizeValidHandle } from "@/lib/x/handle";
import { getXLinkState } from "@/lib/x/link-state";
import type { ActionResult } from "../[id]/actions";

export type CreateDeskResult = { id: string; error?: never } | { id?: never; error: string };

/**
 * Create a desk (an `agents` row) as the signed-in reporter. The client starts voice extraction
 * after this action returns, so a pre-flight failure never rolls back the newly created desk (see
 * lib/voice/create-desk-extraction.ts for the full order-of-operations + ledger contract).
 *
 * Identity now comes from the linked X account, never from client-supplied form state — the
 * old typed-handle field is gone (D14's post-create verify gate is superseded: OAuth already
 * proves the handle at creation time, so `reporter_verified_at` is stamped here, immediately,
 * instead of a later separate verify step).
 */
export async function createDesk(input: {
  name: string;
  beat: string;
  trackedHandles: string[];
  /** Owner-only override — the handle whose VOICE this agent drafts in, when it isn't the
   *  creator's own. Ignored unless the signed-in email is in `lib/owner-allowlist.ts`; that
   *  check is re-run below rather than trusted from whichever client set this. */
  extractFromHandle?: string;
}): Promise<CreateDeskResult> {
  const name = input.name.trim();
  if (!name) return { error: "Name this agent." };
  if (name.length > 30) return { error: "Agent name must be 30 characters or fewer." };

  const beat = input.beat.trim();
  if (!beat) return { error: "Describe the beat this agent should watch." };

  // Every tracked handle is charset-validated too — not just normalized. An unvalidated handle
  // flows into the ingestion worker's globally-shared X stream rule where it could inject stream
  // operators across tenants (see lib/x/handle.ts). One bad handle rejects the whole submit
  // rather than being silently dropped or stored.
  const trackedHandles: string[] = [];
  for (const raw of input.trackedHandles) {
    if (!raw.trim()) continue; // drop empty chips from the form
    if (trackedHandles.length >= MAX_TRACKED_HANDLES) break; // cap (client enforces too)
    const handle = normalizeValidHandle(raw);
    if (!handle) {
      return {
        error: `"${raw.trim()}" isn't a valid X handle — letters, numbers, and underscores, up to 15.`,
      };
    }
    if (!trackedHandles.includes(handle)) trackedHandles.push(handle);
  }
  if (trackedHandles.length === 0) {
    return { error: "Add at least one tracked X account." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired — sign in again to create this agent." };
  }

  // Re-verified here, server-side, on every create — never trusted from the client. A desk's
  // identity-critical field can't come from anything a browser caller could have forged.
  // Connect X still gates creation for EVERY caller, override or not: the owner needs a linked
  // account to post from regardless of whose voice the agent drafts in.
  const { linked, handle } = await getXLinkState();
  const connectedHandle = linked && handle ? normalizeValidHandle(handle) : null;
  if (!connectedHandle) {
    return { error: "Connect your X account before creating an agent." };
  }

  // Owner-only: extract from a handle the caller hasn't authenticated as. The allowlist is
  // re-checked HERE rather than trusted from the client — a server action is a reachable
  // endpoint by ID, so "the form didn't render the field" proves nothing about the caller.
  // A non-allowlisted caller passing this field is silently ignored (not rejected): their
  // agent is created on their own handle, which is the behavior they'd get anyway.
  //
  // The override sets `reporter_handle` — it does NOT keep the agent on the owner's handle
  // while pulling someone else's corpus. `reporter_handle` is what the corpus is pulled for,
  // and `voice_guides`/`voice_rules` are keyed by this desk's `agent_id`, not by handle —
  // so the other direction (extracting the owner's own voice while labeling the desk for
  // someone else) would just mislabel whose voice the desk claims to be drafting in.
  let reporterHandle = connectedHandle;
  if (input.extractFromHandle?.trim() && isOverrideOwner(user.email)) {
    const override = normalizeValidHandle(input.extractFromHandle);
    if (!override) {
      return {
        error: `"${input.extractFromHandle.trim()}" isn't a valid X handle — letters, numbers, and underscores, up to 15.`,
      };
    }
    reporterHandle = override;
  }

  const { data, error } = await supabase
    .from("agents")
    .insert({
      owner_id: user.id,
      name,
      beat,
      reporter_handle: reporterHandle,
      tracked_handles: trackedHandles,
      // Identity is proven by the linked X account at this exact moment, not typed and
      // verified later — verification is immediate now, not a separate step. Stamped on the
      // owner-override path too, even though `voice_guides`' SELECT policy no longer conditions
      // on this column (it checks only `e.id = voice_guides.agent_id and e.owner_id =
      // auth.uid()`) — so this is a record of how identity was proven at creation, not an RLS
      // gate. On the override path the allowlist is the verification.
      reporter_verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not create your agent. Please try again." };
  }

  // Extraction is NOT fired here any more. It used to run as
  // `after(() => attemptVoiceExtraction(...))`, whose return value nothing could read — so the
  // four pre-flight gates ran invisibly and a rejection reached the reporter as a spinner that
  // never resolved. After `createDesk` returns, the client calls `startExtraction`
  // (app/agents/[id]/voice/actions.ts), awaits its free ownership/shape gate and durable run claim,
  // then replaces to Feed. That action hands the billable phase to its own `after()`, while Feed
  // and Voice poll the durable run row.
  //
  // The consequence is deliberate: a desk whose creator closes the tab before the pre-flight
  // returns is created WITHOUT extraction having started. That is a valid, working agent — its
  // sources are tracked and the worker picks them up; only drafting waits — and the Voice tab's
  // retry is the recovery surface, same as for any other extraction failure.

  // Refresh the /agents layout so the site header's desk switcher includes this new desk
  // immediately — without this the switcher renders its stale list and falls back to "Desks".
  revalidatePath("/agents", "layout");

  return { id: data.id };
}

/**
 * Creation-time website onboarding (#106) — same shape as
 * `app/agents/[id]/sources/actions.ts`'s `startWebsiteOnboarding` (reserve synchronously so the
 * chip renders immediately and survives the redirect to the new desk's Sources page, then hand
 * the real, billed onboarding call to `after()`), except this path runs on Sonnet
 * (`SONNET_ONBOARDING_MODEL`), not Qwen — the one deliberate difference between the two entry
 * points per this issue's own scoping. Called once per website, in parallel, right after
 * `createDesk` resolves; never blocks the create-desk form's navigation.
 */
export async function startWebsiteOnboardingAtCreation(
  deskId: string,
  rawUrl: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("owner_id, beat")
    .eq("id", deskId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not load the agent." };

  const url = normalizeSourceUrl(rawUrl);
  if (url === null)
    return { ok: false, error: `"${rawUrl.trim()}" doesn't look like a valid website.` };

  const reserved = await reservePendingSource(deskId, url);
  if ("status" in reserved) {
    if (reserved.status === "source_limit_reached") {
      return { ok: false, error: `An agent can track up to ${MAX_WEBSITES} websites.` };
    }
    if (reserved.status === "already_tracked") return { ok: true };
    return { ok: false, error: "Couldn't reach that site." };
  }

  const ownerId = data.owner_id;
  const beat = data.beat;
  const configId = reserved.configId;
  after(async () => {
    try {
      await onboardSource(deskId, ownerId, url, beat, SONNET_ONBOARDING_MODEL, configId);
    } catch (err) {
      console.error("startWebsiteOnboardingAtCreation: onboardSource threw", err);
      await markPendingSourceFailed(createAdminClient(), configId);
    }
  });

  return { ok: true };
}
