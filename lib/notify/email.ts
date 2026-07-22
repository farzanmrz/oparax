// Not anchored to start-of-string: a recipient can render as `"Oparax Drafts"
// <draft+<uuid>@domain>`, so the pattern must match anywhere in the string (the UUID shape
// stays strict).
const DRAFT_ADDR_RE = /draft\+([0-9a-f-]{36})@/i;
const SUBJECT_TAG_RE = /\[draft:([0-9a-f-]{36})\]/i;

/** Reply-to address that routes an email reply back to its post_drafts row. */
export function draftReplyAddress(postDraftId: string): string {
  const domain = process.env.RESEND_REPLY_DOMAIN;
  if (!domain) throw new Error("RESEND_REPLY_DOMAIN is not set");
  return `draft+${postDraftId}@${domain}`;
}

/** Inverse of the encoding above + the subject-tag fallback. Used by the inbound webhook. */
export function extractPostDraftId(input: {
  to?: string | string[] | null;
  subject?: string | null;
}): string | null {
  const tos = Array.isArray(input.to) ? input.to : input.to ? [input.to] : [];
  for (const t of tos) {
    const m = DRAFT_ADDR_RE.exec(t.trim());
    if (m) return m[1].toLowerCase();
  }
  const s = input.subject ? SUBJECT_TAG_RE.exec(input.subject) : null;
  return s ? s[1].toLowerCase() : null;
}

/** Sends the draft email. Appends the [draft:<id>] subject tag and sets the reply-to. */
export async function sendDraftEmail(input: {
  to: string;
  subject: string;
  text: string;
  postDraftId: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const from = process.env.RESEND_FROM;
  if (!from) throw new Error("RESEND_FROM is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: `${input.subject} [draft:${input.postDraftId}]`,
      text: input.text,
      reply_to: draftReplyAddress(input.postDraftId),
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
}
