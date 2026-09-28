import { z } from "zod";
import { receiveWebhook, responseToken, validSignature } from "@/lib/alerts/webhook";
import { reportServerException } from "@/lib/observability/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 300;

export function GET(request: Request) {
  const token = z.string().min(1).safeParse(new URL(request.url).searchParams.get("crc_token"));
  if (!token.success) return Response.json({ error: "Missing crc_token" }, { status: 400 });
  const secret = process.env.X_CLIENT_SECRET;
  if (!secret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  return Response.json({ response_token: responseToken(token.data, secret) });
}

export async function POST(request: Request) {
  const secret = process.env.X_CLIENT_SECRET;
  if (!secret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-twitter-webhooks-signature-oauth2"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const handled = await receiveWebhook(raw);
    if (!handled) return Response.json({ error: "Command is being processed" }, { status: 503 });
    return Response.json({ ok: true });
  } catch (error) {
    reportServerException(error, { tags: { area: "alerts", stage: "webhook" } });
    return Response.json({ error: "Command could not be recorded" }, { status: 500 });
  }
}
