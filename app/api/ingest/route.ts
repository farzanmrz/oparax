// The named delivery interface — Slice 3's always-on Railway forwarder POSTs live X stream
// deliveries here and changes nothing else in the app. The hand-seeded demo post enters
// through this exact same interface, so this route's request contract is a published one.
// SERVER-ONLY. Fail-closed on a `Bearer $INGEST_SECRET` check, same auth model as
// app/api/cron/tick/route.ts (our own single known caller, not a third-party webhook).
//
// This route owns HTTP concerns ONLY — auth, body validation, response shaping. All
// persistence, metering, and drafting logic lives in processDelivery
// (lib/agent/draft-pipeline.ts); do not duplicate any of it here.

import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { processDelivery } from "@/lib/agent/draft-pipeline";
import { reconcileMissingCosts } from "@/lib/agent/gateway-cost";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  // timingSafeEqual throws on unequal lengths — check first rather than let a length
  // mismatch throw past the constant-time comparison.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const ingestBodySchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("x"),
    x_post_id: z.string().min(1),
    author_handle: z.string().min(1), // normalized via lib/x/handle.ts
    text: z.string().min(1),
    posted_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "posted_at must parse as a date",
    }),
    // Optional for app-before-worker deploy order. Missing language is unknown and the
    // translator decides whether a translation is needed.
    lang: z.string().min(1).max(35).nullable().optional(),
    // Attached photos (full image) or video/GIF poster frames — descriptors only, matching
    // the settled media-handling decision (no playable-variant retention). Optional: most
    // posts carry no media.
    media: z.array(z.object({ kind: z.string().min(1), imageUrl: z.string().url() })).optional(),
    raw: z.unknown().optional(),
  }),
  z.object({
    source: z.literal("website"),
    // deterministic external id — never a fabricated x_post_id
    external_id: z.string().min(1), // sha256(canonicalUrl + "\n" + publishedAtIso)
    url: z.string().url(),
    title: z.string().min(1),
    text: z.string().min(1),
    author_handle: z.string().nullable(),
    published_at: z
      .string()
      .nullable()
      .refine((v) => v === null || !Number.isNaN(Date.parse(v)), {
        message: "published_at must parse as a date",
      }),
    raw: z.unknown().optional(),
  }),
]);

export async function POST(req: Request) {
  const requestStartedAt = Date.now();
  const secret = process.env.INGEST_SECRET;
  if (!secret || !isAuthorized(req.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 422 });
  }

  const parsed = ingestBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 422 });
  }

  try {
    const result = await processDelivery(parsed.data);

    // Repair BYOK costs after the response. This is `reconcileMissingCosts`'s ONE production
    // caller — it was implemented against the gateway's ~19s usage-event lag (live-probed: 404 at
    // 0/1/4/9s, 200 at 19s) and then never wired anywhere, so every DeepSeek/DeepInfra council
    // call sat at cost NULL forever; the first real end-to-end draft is what surfaced that. The
    // 25s pause is the lag plus margin, and it runs in `after()` — post-response, so the
    // forwarder's request is never held hostage to pricing, and inside this route's
    // maxDuration = 300 budget. Deliveries are the only place drafting spend originates, so
    // repairing here (each run also sweeps prior still-null rows, since the repair is idempotent
    // over the newest 200) keeps the ledger converging without a cron.
    //
    // The 25s sleep shares this SAME maxDuration budget as the already-awaited processDelivery
    // call above — a slow delivery (e.g. two full council runs) can return with very little of
    // the 300s left, and a blind 25s sleep would then get killed mid-reconcile with no log of the
    // skip. So the sleep is adaptive: it shrinks to whatever's left after reserving a safety
    // margin for reconcileMissingCosts itself to run, and skips straight to reconciling (or skips
    // reconciling entirely, loudly) once the budget can't cover even that margin.
    after(async () => {
      const RECONCILE_LAG_MS = 25_000;
      const RECONCILE_SAFETY_MARGIN_MS = 5_000;
      const elapsedMs = Date.now() - requestStartedAt;
      const remainingMs = maxDuration * 1000 - elapsedMs;

      if (remainingMs <= RECONCILE_SAFETY_MARGIN_MS) {
        console.log(
          `api/ingest: skipping cost reconciliation — only ${remainingMs}ms left of the ${maxDuration}s budget after processDelivery (${elapsedMs}ms elapsed)`,
        );
        return;
      }

      const sleepMs = Math.min(RECONCILE_LAG_MS, remainingMs - RECONCILE_SAFETY_MARGIN_MS);
      if (sleepMs < RECONCILE_LAG_MS) {
        console.log(
          `api/ingest: reconciling costs after a reduced ${sleepMs}ms margin (wanted ${RECONCILE_LAG_MS}ms) — only ${remainingMs}ms left of the ${maxDuration}s budget after processDelivery (${elapsedMs}ms elapsed)`,
        );
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
        const { repaired, totalUsd } = await reconcileMissingCosts(createAdminClient());
        if (repaired > 0) {
          console.log(`api/ingest: reconciled ${repaired} model_calls costs ($${totalUsd})`);
        }
      } catch (e) {
        // Pricing repair must never look like a delivery failure — the rows keep their
        // generation_id and the next delivery's sweep retries them.
        console.error("api/ingest: reconcileMissingCosts failed", e);
      }
    });

    return Response.json(result);
  } catch (e) {
    console.error("api/ingest: processDelivery failed", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
