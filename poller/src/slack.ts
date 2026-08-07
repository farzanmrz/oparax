/** One-way Slack delivery via the platform-level incoming webhook (SLACK_WEBHOOK_URL) —
 *  mirrors ingest/src/slack.ts by shape (push-only, raw fetch, throws on failure); its own
 *  copy since this package imports nothing from lib/ or from ingest/. */
export async function sendSlackAlarm(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`slack webhook failed: ${res.status} ${await res.text()}`);
  }
}
