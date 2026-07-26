// Sentry on the Node server runtime — loaded by instrumentation.ts's register().
// Shared decisions (DSN, sample rate, data collection) and their reasoning live in
// lib/observability/sentry-shared.ts; only runtime-specific options belong here.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import {
  dropProgressPollTransactions,
  SENTRY_DATA_COLLECTION,
  SENTRY_DSN,
  TRACES_SAMPLE_RATE,
} from "@/lib/observability/sentry-shared";

// AI monitoring needs NO registration here — two integrations this file once added explicitly are
// SDK defaults, verified in the installed build's default-integration lists (@sentry/node's
// auto-performance list and @sentry/node-core's base list respectively):
//
// - `vercelAIIntegration` — auto-registered whenever tracing is enabled. At `ai@7` its documented
//   OpenTelemetry path is dead (v7 dropped OTel entirely; Sentry's OTel instrumentation is
//   version-gated to `<7`) and what actually carries it is @sentry/server-utils' subscriber on
//   v7's `ai:telemetry` Node diagnostics channel, which builds the `gen_ai.*` spans natively
//   (`invoke_agent {functionId}`, `generate_content {model}`) honoring each call's
//   `recordInputs`/`recordOutputs`. Two standing rules from that finding: every AI call must pass
//   `experimental_telemetry.isEnabled: true` (per-call opt-in — lib/observability/ai-telemetry.ts
//   builds it; a call that omits it produces no span at all), and NEVER add a hand-rolled
//   `registerTelemetry` bridge alongside — one was built here on the wrong belief that v7 was
//   unsupported, and it double-counted every call (two spans, two model-name spellings, twice the
//   tokens) until deleted.
// - `conversationIdIntegration` — in the base defaults; it is what makes `Sentry.setConversationId`
//   stamp `gen_ai.conversation.id` onto AI spans so Explore > Conversations can group them. See
//   lib/observability/ai-conversation.ts for what a "conversation" means in this product.
Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  dataCollection: SENTRY_DATA_COLLECTION,

  // This is the runtime that matters most here. Voice extraction and drafting are best-effort by
  // design — `runExtractionSpendPhase` never throws, it catches everything and returns a value —
  // so without log forwarding the console.error calls in lib/voice/* and lib/agent/* would be the
  // ONLY record that anything went wrong, and on a deploy nobody is watching them.
  //
  // `enableLogs: true` alone is NOT sufficient: it turns on the logs product, but the default
  // `consoleIntegration` only attaches console output as breadcrumbs on a FUTURE event. A path
  // that catches everything and returns a value, like `runExtractionSpendPhase`, never creates
  // that event, so the breadcrumb is never sent. `consoleLoggingIntegration` is what actually
  // ships console output as a Sentry log in its own right, event or not. Structured pipeline
  // telemetry goes through `Sentry.logger.*` / `Sentry.metrics.*` directly (both gated on these
  // two flags), with the console forwarding as the net under everything not yet migrated.
  enableLogs: true,
  enableMetrics: true,

  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    // CPU profiling for sampled transactions (Profiling > Node). The extraction and drafting
    // pipelines are long-running server work — a profile is what turns "the pipeline was slow"
    // into "which function was hot". Ships its own prebuilt native binary; server-only, which is
    // why it lives here and not in sentry-shared.ts.
    nodeProfilingIntegration(),
  ],

  // Relative to tracesSampleRate: profile every sampled transaction. Traces run at 1.0 (see
  // sentry-shared.ts — the poll, the only volume problem, is dropped by tag instead), so this
  // profiles every real transaction.
  profilesSampleRate: 1.0,

  // Drop the extraction progress poll — see dropProgressPollTransactions. The poll is a server
  // action, so it is a server transaction too, not only a browser one.
  beforeSendTransaction: dropProgressPollTransactions,
});
