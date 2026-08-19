import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { QWEN_DRAFT_MODEL } from "@/lib/agent/qwen-draft-config";
import { onboardSource } from "@/lib/sources/onboard-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSourceUrl } from "@/lib/websites";

export const maxDuration = 800;

/** How many times one row may run the refresh before this route gives up on it for good.
 *
 *  The poller asks on EVERY tick while `status='active' AND strip_phrases IS NULL`, so the
 *  only thing that ever stopped it was a terminal write. On 2026-08-09 a failure branch
 *  silently skipped that write and one source re-ran the full agentic resolver every 3-5
 *  minutes for three days ($69). That specific hole is fixed in `onboardSource`, but this
 *  bound is what makes the whole CLASS survivable: any future path that forgets a terminal
 *  write now costs three attempts instead of an unbounded loop. Three is deliberately small —
 *  a refresh that fails twice on real evidence is not going to succeed on the tenth try. */
const MAX_REFRESH_ATTEMPTS = 3;

const requestSchema = z.object({ sourceConfigId: z.string().uuid() });

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Poller-only backfill for active rows created before strip_phrases existed. The row and its
 * desk are loaded here instead of trusted from the caller, so a valid ingest secret alone
 * cannot refresh an arbitrary source or choose a different desk/model. */
export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret || !isAuthorized(req.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 422 });

  const admin = createAdminClient();
  const { data: config, error: configError } = await admin
    .from("source_configs")
    .select("id, agent_id, url")
    .eq("id", parsed.data.sourceConfigId)
    .eq("status", "active")
    .is("strip_phrases", null)
    .maybeSingle();
  if (configError) {
    console.error("refresh-strip-phrases: source lookup failed", configError);
    return new Response("source lookup failed", { status: 500 });
  }
  if (!config) return new Response(null, { status: 409 });

  const { data: desk, error: deskError } = await admin
    .from("agents")
    .select("owner_id, beat")
    .eq("id", config.agent_id)
    .maybeSingle();
  if (deskError || !desk) {
    console.error("refresh-strip-phrases: desk lookup failed", deskError);
    return new Response("desk lookup failed", { status: 500 });
  }
  const url = normalizeSourceUrl(config.url);
  if (!url) return new Response("stored source URL invalid", { status: 422 });

  // Burn the attempt BEFORE any billable work. Counting afterwards would let a hard-killed
  // invocation (platform timeout, OOM) retry forever without the counter ever advancing —
  // the exact shape of the incident this bounds.
  const { data: attempts, error: claimError } = await admin.rpc(
    "claim_strip_phrase_refresh_attempt",
    { p_config_id: config.id },
  );
  if (claimError) {
    console.error("refresh-strip-phrases: attempt claim failed", claimError);
    return new Response("attempt claim failed", { status: 500 });
  }
  // NULL means the row stopped being a live refresh target between the select above and the
  // claim (a concurrent tick finished it) — same "nothing to do" answer as the precondition.
  if (attempts === null) return new Response(null, { status: 409 });

  if (attempts > MAX_REFRESH_ATTEMPTS) {
    // Out of attempts: persist the terminal marker so the poller stops asking, and say so
    // loudly. `[]` is the same completed-clean-sample value the success path writes — the
    // source keeps polling normally, just without measured strip phrases.
    const { error: giveUpError } = await admin.rpc("refresh_source_strip_phrases", {
      p_config_id: config.id,
      p_agent_id: config.agent_id,
      p_strip_phrases: [],
    });
    if (giveUpError) {
      console.error("refresh-strip-phrases: give-up marker failed", giveUpError);
      return new Response("give-up marker failed", { status: 500 });
    }
    const message = `refresh-strip-phrases: gave up on ${config.url} after ${MAX_REFRESH_ATTEMPTS} attempts`;
    console.error(message, {
      sourceConfigId: config.id,
      agentId: config.agent_id,
      attempts,
    });
    return new Response(null, { status: 204 });
  }

  try {
    await onboardSource(
      config.agent_id,
      desk.owner_id,
      url,
      desk.beat,
      QWEN_DRAFT_MODEL,
      config.id,
      "refresh_strip_phrases_only",
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("refresh-strip-phrases: onboarding failed", error);
    return new Response("refresh failed", { status: 500 });
  }
}
