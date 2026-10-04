import "server-only";

import { waitUntil } from "@vercel/functions";
import { getPostHogServerClient } from "@/lib/observability/posthog-server";

export type EventName =
  | "agent_build_requested"
  | "signed_in"
  | "x_balance_read"
  | "agent_build_started"
  | "agent_built"
  | "agent_build_failed"
  | "build_refused"
  | "trial_started"
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

type BuildRefusedReason =
  | "signed_out"
  | "handle_required"
  | "invalid_handle"
  | "invalid_request"
  | "beat_required"
  | "beat_too_long"
  | "x_identity_invalid"
  | "reserved_handle"
  | "bot"
  | "kill_switch"
  | "credits"
  | "budget"
  | "build_unavailable"
  | "profile_not_found"
  | "profile_unavailable"
  | "identity_mismatch"
  | "ownership_conflict"
  | "handle_conflict";

export function track(
  event: "signed_in",
  props: { method: "password" | "oauth" | "email_link" },
  distinctId: string,
): void;
export function track(
  event: "build_refused",
  props: { reason: BuildRefusedReason },
  distinctId: string,
): void;
export function track(
  event: "trial_started",
  props: { monitor_id: string; trigger: "build_completed" },
  distinctId: string,
): void;
export function track(
  event: Exclude<EventName, "signed_in" | "build_refused" | "trial_started">,
  props: Record<string, unknown>,
  distinctId: string,
): void;
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
