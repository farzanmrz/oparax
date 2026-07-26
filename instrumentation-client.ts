// Sentry in the browser — Next loads this file itself on every page load.
// Shared decisions (DSN, sample rate, data collection) and their reasoning live in
// lib/observability/sentry-shared.ts; only browser-specific options belong here.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  dropProgressPollTransactions,
  SENTRY_DATA_COLLECTION,
  SENTRY_DSN,
  TRACES_SAMPLE_RATE,
} from "@/lib/observability/sentry-shared";

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  dataCollection: SENTRY_DATA_COLLECTION,
  enableLogs: true,

  // Session Replay records unmasked — an OWNER DECISION, made after seeing that a fully masked
  // replay of this app shows grey blocks where every meaningful thing is. Masking defaults to on,
  // and for this product the default was defensible: a replay captures a reporter's unpublished
  // draft as they type it, which is the most sensitive thing here. That trade is now made the
  // other way, knowingly — replays will contain draft text, voice guides and beat descriptions,
  // stored by Sentry under its retention policy. This is the one place in this setup where
  // reporter-authored prose is recorded; `ai-telemetry.ts` deliberately keeps drafting content out
  // of AI spans, and this partially reopens what that closes.
  //
  // If it needs narrowing later, narrow it selectively (`mask` / `block` / `ignore` selectors on
  // the draft editor specifically) rather than switching the blanket masking back on — the blanket
  // setting is what made replays useless.
  //
  // `enableLogs: true` alone does not forward console output — the default `consoleIntegration`
  // only attaches it as a breadcrumb on a future event. `consoleLoggingIntegration` ships console
  // output as a Sentry log directly, event or not.
  integrations: [
    Sentry.replayIntegration({ maskAllText: false, maskAllInputs: false, blockAllMedia: false }),
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  // Drop the extraction progress poll — see dropProgressPollTransactions. Without this, one
  // reporter watching one extraction contributes ~34 transactions/minute of pure noise.
  beforeSendTransaction: dropProgressPollTransactions,

  // Errors get a replay every time; healthy sessions are sampled thinly. The 1.0-on-error rate
  // is the point of the feature — the whole reason to record is the session that broke.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
