import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { MAIL_UNCERTAIN, mailConfigured, sendMail } from "@/lib/contact/mail";
import { claimRun } from "@/lib/guards/claims";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const contactSchema = z.object({
  kind: z.literal("contact"),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  message: z.string().trim().min(1).max(2000),
});

export async function saveContact(
  input: z.infer<typeof contactSchema>,
  requestId?: string,
): Promise<
  { ok: true; id: string } | { ok: false; error: "busy" | "rate_limit" | "request_conflict" }
> {
  const { email, message } = contactSchema.parse(input);
  const digest = createHash("sha256")
    .update(JSON.stringify([email, message, new Date().toISOString().slice(0, 10)]))
    .digest("hex");
  // Clients without a retry key still save the same message only once per UTC day.
  const id = requestId
    ? z.uuid().parse(requestId)
    : `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const emailKey = createHash("sha256").update(email).digest("hex");
  // Serialize the count and insert so concurrent submissions cannot exceed the daily allowance.
  const claim = await claimRun(`contact-save:${emailKey}`, 360);
  if (!claim) return { ok: false, error: "busy" };
  try {
    const db = createAdminClient();
    const { data: existing, error: readError } = await db
      .from("contact_messages")
      .select("email,message")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) {
      return existing.email === email && existing.message === message
        ? { ok: true, id }
        : { ok: false, error: "request_conflict" };
    }
    const midnight = new Date();
    midnight.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await db
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", midnight.toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= 3) return { ok: false, error: "rate_limit" };
    const { error } = await db.from("contact_messages").insert({
      id,
      email,
      message,
      error: mailConfigured() ? null : "mail not configured",
    });
    if (error) throw error;
    return { ok: true, id };
  } finally {
    await claim.release();
  }
}

export async function deliverContact(
  id: string,
): Promise<"sent" | "deferred" | "failed" | "skipped"> {
  z.uuid().parse(id);
  const claim = await claimRun(`contact-mail:${id}`, 360);
  if (!claim) return "skipped";
  try {
    const db = createAdminClient();
    const { data: row, error: readError } = await db
      .from("contact_messages")
      .select("id,email,message,tries,emailed_at,error")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!row || row.emailed_at || row.tries >= 2 || row.error === MAIL_UNCERTAIN) return "skipped";
    if (!mailConfigured()) {
      const { error } = await db
        .from("contact_messages")
        .update({ error: "mail not configured" })
        .eq("id", id);
      if (error) throw error;
      return "deferred";
    }
    // A crashed or ambiguous SMTP send must not be sent again automatically.
    const { data: attempt, error: claimError } = await db
      .from("contact_messages")
      .update({ tries: row.tries + 1, error: MAIL_UNCERTAIN })
      .eq("id", id)
      .eq("tries", row.tries)
      .is("emailed_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!attempt) return "skipped";
    const result = await sendMail({
      to: "no-reply@oparax.ai",
      replyTo: row.email,
      subject: "Oparax contact",
      text: row.message,
    });
    const { error } = await db
      .from("contact_messages")
      .update(
        result.ok
          ? { emailed_at: new Date().toISOString(), error: null }
          : { error: result.error, tries: result.configured ? row.tries + 1 : row.tries },
      )
      .eq("id", id);
    if (error) throw error;
    if (result.ok) {
      track("contact_sent", { contact_id: id }, id);
      return "sent";
    }
    return result.configured ? "failed" : "deferred";
  } finally {
    await claim.release();
  }
}

export async function retryContact(deadline: number) {
  const db = createAdminClient();
  const counts = { sent: 0, deferred: 0, failed: 0, skipped: 0 };
  const { data, error } = await db
    .from("contact_messages")
    .select("id")
    .is("emailed_at", null)
    .lt("tries", 2)
    .or(`error.is.null,error.neq.${MAIL_UNCERTAIN}`)
    .order("created_at")
    .order("id")
    .limit(100);
  if (error) throw error;
  const rows = data ?? [];
  // Use a fixed batch because sending removes rows from the pending set.
  for (let start = 0; start < rows.length && Date.now() < deadline; start += 5) {
    await Promise.all(
      rows.slice(start, start + 5).map(async (row) => {
        try {
          counts[await deliverContact(row.id)] += 1;
        } catch (error) {
          counts.failed += 1;
          reportServerException(error, { tags: { area: "contact", stage: "retry" } });
        }
      }),
    );
  }
  return counts;
}
