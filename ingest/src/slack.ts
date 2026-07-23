/** One-way Slack delivery via the platform-level incoming webhook (SLACK_WEBHOOK_URL) —
 *  mirrors the app's lib/notify/slack.ts by shape (push-only, raw fetch, throws on failure)
 *  but is its own copy: this package imports nothing from lib/. */
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
