// Server-safe pieces of the Building run model: the step ids and the ?at= / ?state= page parameters.

// The product's seven phases (lib/monitor/content.ts, onboarding.phases), in order.
export const stepIds = ["profile", "posts", "gather", "jev", "choose", "search", "save"] as const;
export type StepId = (typeof stepIds)[number];
export type RunMode = { kind: "replay" } | { kind: "frozen"; at: number | "done" } | { kind: "failed" };

/** Parses ?at= (1..7 or done) and ?state=failed into a run mode. */
export function modeFromParams(at: string | undefined, state?: string): RunMode {
  const n = Number(at);
  if (state === "failed") return { kind: "failed" };
  if (at === "done") return { kind: "frozen", at: "done" };
  if (Number.isInteger(n) && n >= 1 && n <= stepIds.length) return { kind: "frozen", at: n };
  return { kind: "replay" };
}

