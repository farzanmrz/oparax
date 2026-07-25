// Sentry on the edge runtime (proxy.ts and any edge route) — loaded by instrumentation.ts's
// register(). Unrelated to the Vercel Edge Runtime, and required when running locally too.
// Shared decisions and their reasoning live in lib/observability/sentry-shared.ts.
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
  // `enableLogs: true` alone does not forward console output — the default `consoleIntegration`
  // only attaches it as a breadcrumb on a future event, which a caught-and-swallowed failure
  // never creates. `consoleLoggingIntegration` ships console output as a Sentry log directly.
  enableLogs: true,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],

  // Same poll filter as the other two runtimes. No AI integration here on purpose: every AI call
  // in this repo is server-only (lib/voice, lib/agent both read lib/sysprompts via readFileSync at
  // module scope, which cannot run on edge), so registering it here would instrument nothing.
  beforeSendTransaction: dropProgressPollTransactions,
});
