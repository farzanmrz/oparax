import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { QWEN_DRAFT_MODEL } from "@/lib/agent/qwen-draft-config";
import { onboardSource } from "@/lib/sources/onboard-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSourceUrl } from "@/lib/websites";

export const maxDuration = 800;

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
