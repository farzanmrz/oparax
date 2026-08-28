// lib/x/bot.ts
//
// Raw-fetch client for the Oparax bot account (minted via POST /2/bots at ship; env carries
// its one-time `xcbot_` bearer and numeric user id). Sends DMs and uploads DM images. Pure
// module: no Supabase, no Next.js, no I/O beyond fetch. Callers NEVER call this without first
// reserving through reserve_dm_send — the ledger is the cap story.

const X_API = "https://api.x.com/2";
const REQUEST_TIMEOUT_MS = 20_000;
/** DM media upload can carry a real image; give it longer than a JSON call. */
const MEDIA_TIMEOUT_MS = 30_000;

export function botToken(): string {
  const token = process.env.X_BOT_TOKEN;
  if (!token) throw new Error("X_BOT_TOKEN is not set");
  return token;
}

export function botUserId(): string {
  const id = process.env.X_BOT_USER_ID;
  if (!id) throw new Error("X_BOT_USER_ID is not set");
  return id;
}

export function botConfigured(): boolean {
  return Boolean(process.env.X_BOT_TOKEN && process.env.X_BOT_USER_ID);
}

export class BotSendError extends Error {
  readonly status: number;
  constructor(endpoint: string, status: number, body: string) {
    super(`bot ${endpoint} failed: HTTP ${status} — ${body.slice(0, 300)}`);
    this.name = "BotSendError";
    this.status = status;
  }
}

/** Send one DM to a participant. Returns the DM event id when X reports one. Throws
 *  BotSendError on a definite refusal (closed DMs, caps) — the caller decides release vs
 *  consume based on whether the failure was definite. */
export async function sendBotDm(params: {
  participantId: string;
  text: string;
  mediaId?: string;
}): Promise<{ dmEventId: string | null }> {
  const endpoint = `/dm_conversations/with/${encodeURIComponent(params.participantId)}/messages`;
  const res = await fetch(`${X_API}${endpoint}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${botToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: params.text,
      ...(params.mediaId ? { attachments: [{ media_id: params.mediaId }] } : {}),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const bodyText = await res.text();
  if (!res.ok) throw new BotSendError(endpoint, res.status, bodyText);
  try {
    const body = JSON.parse(bodyText) as { data?: { dm_event_id?: string } };
    return { dmEventId: body.data?.dm_event_id ?? null };
  } catch {
    return { dmEventId: null };
  }
}

/**
 * Fetch an image and upload it through the bot's media.write as DM media. X media upload takes
 * BINARY, never a URL. Returns the media id, or null on any failure — an alert always degrades
 * to text-only rather than failing on its picture.
 */
export async function uploadBotDmImage(imageUrl: string): Promise<string | null> {
  try {
    const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS) });
    if (!imageRes.ok) return null;
    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const bytes = await imageRes.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) return null;

    const form = new FormData();
    form.set("media", new Blob([bytes], { type: contentType }), "alert-image");
    form.set("media_category", "dm_image");
    const uploadRes = await fetch(`${X_API}/media/upload`, {
      method: "POST",
      headers: { authorization: `Bearer ${botToken()}` },
      body: form,
      signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
    });
    if (!uploadRes.ok) {
      console.warn(`bot: media upload failed (${uploadRes.status})`);
      return null;
    }
    const body = (await uploadRes.json()) as {
      data?: { id?: string; media_id_string?: string };
      media_id_string?: string;
    };
    return body.data?.id ?? body.data?.media_id_string ?? body.media_id_string ?? null;
  } catch (error) {
    console.warn("bot: media upload failed", error);
    return null;
  }
}
