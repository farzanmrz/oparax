/** One-way Slack delivery via the platform-level incoming webhook (SLACK_WEBHOOK_URL).
 *  Push-only by design: incoming webhooks cannot carry actionable interactive components —
 *  buttons need a full Slack app + interactions endpoint (deferred; decisions.md D5). */
export async function sendSlackMessage(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) throw new Error("SLACK_WEBHOOK_URL is not set");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`);
}
