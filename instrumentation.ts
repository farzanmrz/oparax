import * as Sentry from "@sentry/nextjs";

type AiDevtoolsGlobal = typeof globalThis & {
  oparaxAiDevtoolsRegistration?: Promise<void>;
};

/** Register once across Next dev hot reloads. DevTools writes complete prompts, outputs, and
 * provider payloads to local disk, so it must never initialize in a production build/runtime. */
function registerAiDevtools(): Promise<void> {
  const state = globalThis as AiDevtoolsGlobal;
  state.oparaxAiDevtoolsRegistration ??= Promise.all([
    import("ai"),
    import("@ai-sdk/devtools"),
  ]).then(([{ registerTelemetry }, { DevToolsTelemetry }]) => {
    registerTelemetry(DevToolsTelemetry());
  });
  return state.oparaxAiDevtoolsRegistration;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    if (process.env.NODE_ENV === "development") await registerAiDevtools();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
