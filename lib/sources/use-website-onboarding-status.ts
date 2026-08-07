"use client";

// lib/sources/use-website-onboarding-status.ts
//
// Polls getWebsiteOnboardingStatus(deskId) on a fixed interval while any site added this
// session hasn't resolved yet (#106) — same 2000ms cadence as
// lib/voice/use-extraction-progress.ts, deliberately simpler: each poll's result is the full,
// current set of pending/failed source_configs rows for this desk, so it fully replaces local
// state rather than merging (there's no streamed sub-state to preserve across polls, unlike
// voice extraction's reasoning/tool-activity accumulation).
import { useCallback, useEffect, useRef, useState } from "react";
import { getWebsiteOnboardingStatus } from "@/app/agents/[id]/sources/actions";

const POLL_INTERVAL_MS = 2000;

export type WebsiteOnboardingEntry = { url: string; status: string; errorCode?: string };

export function useWebsiteOnboardingStatus(
  deskId: string,
  options: { refreshKey: number },
): { entries: WebsiteOnboardingEntry[]; readError: boolean; retry: () => void } {
  const [entries, setEntries] = useState<WebsiteOnboardingEntry[]>([]);
  const [readError, setReadError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    // Read so an explicit retry intentionally restarts this effect without changing its policy.
    void retryNonce;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (cancelled) return;
      const result = await getWebsiteOnboardingStatus(deskId).catch(() => ({ ok: false }) as const);
      if (cancelled) return;
      if (!result.ok) {
        setReadError(true);
        if (
          entriesRef.current.some((entry) => entry.status === "pending") ||
          options.refreshKey > 0
        ) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
        return;
      }
      setReadError(false);
      setEntries(result.entries);
      if (result.entries.some((entry) => entry.status === "pending") || options.refreshKey > 0) {
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [deskId, options.refreshKey, retryNonce]);

  const retry = useCallback(() => setRetryNonce((current) => current + 1), []);
  return { entries, readError, retry };
}
