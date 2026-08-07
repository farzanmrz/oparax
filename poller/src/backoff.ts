export interface BackoffLimits {
  base: number;
  max: number;
}

/** Exponential backoff with half-jitter: the delay is [exp/2, exp) rather than [0, exp), so a
 *  retry never rolls a near-zero wait right after a failure. Mirrors ingest/src/backoff.ts. */
export function backoffDelay(attempt: number, { base, max }: BackoffLimits): number {
  const exp = Math.min(max, base * 2 ** attempt);
  return exp / 2 + Math.random() * (exp / 2);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
