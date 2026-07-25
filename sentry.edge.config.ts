// Sentry on the edge runtime (proxy.ts and any edge route) — loaded by instrumentation.ts's
// register(). Unrelated to the Vercel Edge Runtime, and required when running locally too.
// Shared decisions and their reasoning live in lib/observability/sentry-shared.ts.
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
});
