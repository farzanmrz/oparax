// Sentry in the browser — Next loads this file itself on every page load.
// Shared decisions (DSN, sample rate, data collection) and their reasoning live in
// lib/observability/sentry-shared.ts; only browser-specific options belong here.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  SENTRY_DATA_COLLECTION,
  SENTRY_DSN,
  TRACES_SAMPLE_RATE,
} from "@/lib/observability/sentry-shared";

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  dataCollection: SENTRY_DATA_COLLECTION,
  enableLogs: true,

  // Session Replay masks all text and blocks all media by default, which is what makes it safe
  // to run against this product at all — a replay would otherwise record the reporter's
  // unpublished drafts as they typed them. Do not switch that masking off to "make replays more
  // useful"; the same reasoning that keeps httpBodies empty applies here and applies harder,
  // because a replay captures the draft mid-composition.
  // `enableLogs: true` alone does not forward console output — the default `consoleIntegration`
  // only attaches it as a breadcrumb on a future event. `consoleLoggingIntegration` ships console
  // output as a Sentry log directly, event or not.
  integrations: [
    Sentry.replayIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  // Errors get a replay every time; healthy sessions are sampled thinly. The 1.0-on-error rate
  // is the point of the feature — the whole reason to record is the session that broke.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
