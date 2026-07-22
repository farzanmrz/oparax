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
import { z } from "zod";
import { processDelivery } from "@/lib/agent/draft-pipeline";

export const maxDuration = 300;

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  // timingSafeEqual throws on unequal lengths — check first rather than let a length
  // mismatch throw past the constant-time comparison.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const ingestBodySchema = z.object({
  x_post_id: z.string().min(1),
  author_handle: z.string().min(1),
  text: z.string().min(1),
  posted_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "posted_at must parse as a date",
  }),
  raw: z.unknown().optional(),
});

export async function POST(req: Request) {
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
    return Response.json(result);
  } catch (e) {
    console.error("api/ingest: processDelivery failed", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
