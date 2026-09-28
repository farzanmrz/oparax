import "server-only";

import { waitUntil } from "@vercel/functions";
import { getPostHogServerClient } from "@/lib/observability/posthog-server";

export type EventName =
  | "agent_build_requested"
  | "x_balance_read"
  | "agent_build_started"
  | "agent_built"
  | "agent_build_failed"
  | "build_refused"
  | "trial_started"
  | "page_viewed_outside"
  | "bot_connected"
  | "bot_paused"
  | "bot_stopped"
  | "story_alerted"
  | "delivery_held"
  | "paywall_shown"
  | "checkout_started"
  | "payment_succeeded"
  | "payment_failed"
  | "subscription_cancelled"
  | "signin_link_sent"
  | "source_added"
  | "source_removed"
  | "source_no_filter_changed"
  | "account_watch_changed"
  | "alert_hour_changed"
  | "digest_switched"
  | "repo_followed"
  | "contact_sent"
  | "spend_recorded"
  | "source_paused"
  | "run_completed"
  | "run_failed"
  | "run_skipped";

export function track(event: EventName, props: Record<string, unknown>, distinctId: string): void {
  try {
    const client = getPostHogServerClient();
    if (!client) return;
    client.capture({ distinctId, event, properties: props });
    waitUntil(
      client.flush().catch((error) => console.error("posthog-events: flush failed", error)),
    );
  } catch (error) {
    console.error("posthog-events: capture failed", error);
  }
}
