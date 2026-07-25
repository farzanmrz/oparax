// Sentry on the Node server runtime — loaded by instrumentation.ts's register().
// Shared decisions (DSN, sample rate, data collection) and their reasoning live in
// lib/observability/sentry-shared.ts; only runtime-specific options belong here.
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

  // This is the runtime that matters most here. Voice extraction and drafting are best-effort by
  // design — `runExtractionSpendPhase` never throws, it catches everything and returns a value —
  // so the console.error calls in lib/voice/* and lib/agent/* are currently the ONLY record that
  // anything went wrong, and on a deploy nobody is watching them. Forwarding logs is what turns
  // a silently-swallowed failure into something diagnosable after the fact.
  enableLogs: true,
});
