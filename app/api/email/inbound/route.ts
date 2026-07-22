// Resend's inbound-reply webhook: a reporter emails a correction to a draft, this route maps
// it back to that draft and hands the correction to the pipeline's applyCorrection. THIRD-PARTY
// WEBHOOK — unlike app/api/ingest (our own caller, static Bearer) or app/api/cron/tick (same),
// auth here is per-request Svix signature verification over the RAW body, a structurally
// different contract. Node runtime (default) — no edge.
//
// Signature scheme verified against Resend's + Svix's current docs (both reachable, 2026-07-22:
// resend.com/docs/dashboard/webhooks/verify-webhooks-requests, docs.svix.com/receiving/
// verifying-payloads/how-manual): the signed content is `${svix-id}.${svix-timestamp}.${rawBody}`,
// HMAC-SHA256 keyed by the base64 portion of RESEND_WEBHOOK_SECRET (the part after its `whsec_`
// prefix), checked against every space-delimited `v1,<base64>` entry in svix-signature — any one
// match passes. Implemented inline with node:crypto per the brief — no `svix` package, no new
// dependency.
//
// This route owns HTTP + webhook-auth concerns ONLY. All persistence, metering, and revision
// logic lives in applyCorrection (lib/agent/draft-pipeline.ts); do not duplicate any of it here.
import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { applyCorrection } from "@/lib/agent/draft-pipeline";
import { extractPostDraftId } from "@/lib/notify/email";

// Its after() callback runs a full revision model call plus two deliveries — matches every
// other model-calling route in the repo (/api/chat, /api/cron/tick, /api/ingest all set 300).
export const maxDuration = 300;

// Svix's own recommended replay-protection window (their docs describe the check but not a
// mandated number for a manual implementation — 5 minutes matches the Svix libraries' default).
const TIMESTAMP_TOLERANCE_SECONDS = 300;

function verifySvixSignature(input: {
  id: string;
  timestamp: string;
  signatureHeader: string;
  body: string;
  secret: string;
}): boolean {
  if (!input.secret.startsWith("whsec_")) return false;
  const secretBytes = Buffer.from(input.secret.slice("whsec_".length), "base64");
  const signedContent = `${input.id}.${input.timestamp}.${input.body}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest();

  for (const entry of input.signatureHeader.trim().split(/\s+/)) {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) continue;
    let candidate: Buffer;
    try {
      candidate = Buffer.from(sig, "base64");
    } catch {
      continue;
    }
    // timingSafeEqual throws on unequal lengths — check first rather than let a length
    // mismatch (e.g. a truncated/garbage header) throw past the constant-time comparison.
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return true;
    }
  }
  return false;
}

// Cuts at the first quote-history marker — an "On ... wrote:" line, a `>`-quoted line, or an
// "-----Original Message-----" separator — and trims. The reporter's correction is whatever
// sits above it.
const QUOTE_MARKERS = [/^On .+ wrote:\s*$/, /^>/, /^-+\s*original message\s*-+$/i];

function stripQuotedHistory(text: string): string {
  const lines = text.split(/\r?\n/);
  const cutAt = lines.findIndex((line) => QUOTE_MARKERS.some((marker) => marker.test(line)));
  return (cutAt === -1 ? lines : lines.slice(0, cutAt)).join("\n").trim();
}

// Crude tag stripper — only reached when Resend returns no plain-text body. No mail-parsing
// dependency, per the brief.
function stripHtmlTags(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

// The `email.received` webhook payload carries metadata only (to/subject/email_id) — Resend
// deliberately omits the body so large attachments don't blow serverless request-body limits.
// The actual text/html lives behind the Received Emails API; fetched here the same raw-fetch
// way lib/notify/email.ts sends mail, off the same RESEND_API_KEY — no `resend` SDK added.
async function fetchReceivedEmailBody(
  emailId: string,
): Promise<{ text: string | null; html: string | null } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { text?: string | null; html?: string | null };
  return { text: body.text ?? null, html: body.html ?? null };
}

type InboundPayload = {
  type?: string;
  data?: {
    to?: string[];
    from?: string;
    subject?: string;
    email_id?: string;
    text?: string | null;
    html?: string | null;
  };
};

// Pulls a bare address out of a possible `"Display Name" <addr@host>` form, or returns the
// input unchanged (lowercased) when it's already a bare address.
function extractBareAddress(raw: string): string {
  const angleMatch = /<([^>]+)>/.exec(raw);
  return (angleMatch ? angleMatch[1] : raw).trim().toLowerCase();
}

export async function POST(req: Request) {
  // 1. RAW body first — the signature is computed over the exact bytes; req.json() here would
  // make verification impossible.
  const rawBody = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Fail closed: unset secret, any missing header, a stale timestamp, or a signature mismatch
  // are all the same outcome — 401, before any JSON.parse.
  if (!secret || !svixId || !svixTimestamp || !svixSignature) {
    return new Response("Unauthorized", { status: 401 });
  }

  const timestampSeconds = Number(svixTimestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > TIMESTAMP_TOLERANCE_SECONDS
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (
    !verifySvixSignature({
      id: svixId,
      timestamp: svixTimestamp,
      signatureHeader: svixSignature,
      body: rawBody,
      secret,
    })
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Only now parse — the signature above covers the exact bytes we just verified.
  let payload: InboundPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("email/inbound: unparseable payload despite a valid signature", err);
    return new Response("OK", { status: 200 });
  }

  if (payload.type !== "email.received" || !payload.data) {
    console.error(`email/inbound: ignoring event type ${payload.type}`);
    return new Response("OK", { status: 200 });
  }

  // 3. Authenticate the human sender. The Svix signature above proves the request came from
  // Resend — it proves nothing about who sent the email. A draft's reply address
  // (draft+<uuid>@domain) or its [draft:<uuid>] subject tag can leak in plain email headers
  // (forwards, CCs, a screenshot), and a draft id is otherwise a bearer token: whoever emails
  // it can spend a paid revision call and rewrite the draft that posts in the reporter's name.
  // This is the single-tenant form of the check — one global recipient env var. Per-desk
  // sender authorization arrives with the Channels surface (decisions.md D5), which is also
  // where this global recipient env var goes away.
  const authorizedSender = process.env.NOTIFY_EMAIL_TO;
  if (!authorizedSender) {
    console.error("email/inbound: NOTIFY_EMAIL_TO is not set; no authorized sender configured");
    return new Response("Unauthorized", { status: 401 });
  }
  const senderAddress = payload.data.from ? extractBareAddress(payload.data.from) : "";
  if (senderAddress !== authorizedSender.trim().toLowerCase()) {
    console.error(`email/inbound: rejected reply from unauthorized sender "${payload.data.from}"`);
    return new Response("OK", { status: 200 });
  }

  // 4. Route by draft id. Unknown/absent id → log and 200 (a non-2xx makes Resend retry a
  // message we can never route).
  const postDraftId = extractPostDraftId({
    to: payload.data.to ?? null,
    subject: payload.data.subject ?? null,
  });
  if (!postDraftId) {
    console.error("email/inbound: no draft id in to/subject; dropping", payload.data);
    return new Response("OK", { status: 200 });
  }

  // 5. Prefer a body already present on the payload; fall back to the Received Emails API
  // fetch only when the payload doesn't carry one. Cheap, and removes a single point of
  // failure on an endpoint whose payload shape we don't control. Strip quoted history from
  // whichever body we end up with. Empty correction → log, 200, no-op.
  const emailId = payload.data.email_id;
  const inlineBody =
    payload.data.text != null || payload.data.html != null
      ? { text: payload.data.text ?? null, html: payload.data.html ?? null }
      : null;
  const email = inlineBody ?? (emailId ? await fetchReceivedEmailBody(emailId) : null);
  if (!email) {
    console.error(`email/inbound: could not fetch body for email ${emailId}`);
    return new Response("OK", { status: 200 });
  }

  const rawText = email.text ?? (email.html ? stripHtmlTags(email.html) : "");
  const feedback = stripQuotedHistory(rawText);
  if (!feedback) {
    console.error(`email/inbound: empty correction after stripping for draft ${postDraftId}`);
    return new Response("OK", { status: 200 });
  }

  // 6. Ack 200 immediately — applyCorrection makes a paid model call and re-delivers, far too
  // slow to hold the webhook response open. Errors inside after() are caught here, never
  // rethrown into an already-sent response. svix-id is the idempotency key: a duplicate Svix
  // delivery becomes a no-op inside applyCorrection.
  after(async () => {
    try {
      await applyCorrection({ postDraftId, feedback, idempotencyKey: svixId });
    } catch (err) {
      console.error(`email/inbound: applyCorrection failed for draft ${postDraftId}`, err);
    }
  });

  return new Response("OK", { status: 200 });
}
