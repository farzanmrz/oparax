import "server-only";

import { waitUntil } from "@vercel/functions";
import { PostHog } from "posthog-node";

/**
 * Server-side PostHog error sink. The only thing the Sentry removal (#124) left on the server
 * was `console.error`, which lands in short-lived Vercel logs that nobody reads. Every site that
 * used to call `Sentry.captureException` / `Sentry.captureMessage` now calls one of the two
 * helpers below, so paid work that fails (a voice extraction, a drafting run, a watchdog
 * detection) still becomes a grouped, alertable issue in PostHog Error Tracking.
 *
 * No token (local dev without PostHog configured) means every call is a no-op.
 */

const DISTINCT_ID = "server";

let client: PostHog | null | undefined;

export function getPostHogServerClient(): PostHog | null {
  if (client !== undefined) return client;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) {
    client = null;
    return client;
  }
  client = new PostHog(token, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    // Serverless: hold the function open until the batch is flushed rather than relying on a timer
    // that the runtime may freeze first. waitUntil is a no-op outside Vercel.
    waitUntil,
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export type ServerErrorLevel = "warning" | "error" | "fatal";

export type ServerErrorContext = {
  /** Low-cardinality labels used to group and filter issues (area, stage, outcome, scope). */
  readonly tags?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  /** High-cardinality details attached to the individual occurrence. */
  readonly extra?: Readonly<Record<string, unknown>>;
  /** The signed-in user the failure belongs to, when one is known. */
  readonly distinctId?: string;
  readonly level?: ServerErrorLevel;
};

/** Report a caught error as a PostHog exception. Never throws; a sink failure is logged only. */
export function reportServerException(error: unknown, context: ServerErrorContext = {}): void {
  const ph = getPostHogServerClient();
  if (!ph) return;
  try {
    ph.captureException(
      error instanceof Error ? error : new Error(String(error)),
      context.distinctId ?? DISTINCT_ID,
      {
        ...context.tags,
        ...context.extra,
        level: context.level ?? "error",
        source: "server",
      },
    );
  } catch (sinkError) {
    console.error("posthog-server: captureException failed", sinkError);
  }
}

/** Report a condition that has no thrown error behind it (a watchdog detection, an exhausted
 *  retry budget). Grouped by message, so keep identifiers out of `message` and in `tags`/`extra`. */
export function reportServerMessage(message: string, context: ServerErrorContext = {}): void {
  const err = new Error(message);
  err.name = "ServerReport";
  reportServerException(err, { level: "warning", ...context });
}

/** Structured-log twin: takes the same `{ error, ...context }` object a `console.error` call
 *  already carries, so a site can report without restating its context. A missing `error`
 *  means the condition is a message (warning level); scope/stage/area/outcome become tags. */
export function reportServerLog(
  message: string,
  props: Readonly<Record<string, unknown>> & { readonly error?: unknown },
  options: { readonly distinctId?: string; readonly level?: ServerErrorLevel } = {},
): void {
  const { error, ...rest } = props;
  const tags: Record<string, string> = {};
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (["scope", "stage", "area", "outcome", "failure_leg"].includes(k) && typeof v === "string") {
      tags[k] = v;
    } else {
      extra[k] = v;
    }
  }
  if (error === undefined) {
    reportServerMessage(message, { tags, extra, ...options });
    return;
  }
  const err = error instanceof Error ? error : new Error(`${message}: ${String(error)}`);
  reportServerException(err, { tags, extra, ...options });
}
