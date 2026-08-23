// The interactive writer has its own model and timeout knobs, separate from the Qwen stages.
export const GEMINI_WRITE_MODEL = "google/gemini-3.7-flash";

export function geminiWriteProviderOptions(ownerId: string) {
  return {
    gateway: {
      sort: "ttft" as const,
      user: ownerId,
      tags: ["feature:draft-button", "stage:draft_write"],
    },
  };
}

// This is an interactive call with a waiting UI, so it uses a quarter of the Qwen batch guard.
export const GEMINI_WRITE_TIMEOUT_MS = 30_000;
export const GEMINI_WRITE_CLAIM_STALE_MS = 90_000;

/** Bounds the writer by both its stuck-call guard and the enclosing request deadline. */
export function geminiStageAbortSignal(timeoutMs: number, deadlineAt?: number): AbortSignal {
  const remaining = deadlineAt === undefined ? timeoutMs : Math.max(1, deadlineAt - Date.now());
  return AbortSignal.timeout(Math.min(timeoutMs, remaining));
}
