"use client";

// lib/sources/use-website-onboarding-status.ts
//
// Polls getWebsiteOnboardingStatus(deskId) on a fixed interval while any site added this
// session hasn't resolved yet (#106) — same 2000ms cadence as
// lib/voice/use-extraction-progress.ts, deliberately simpler: each poll's result is the full,
// current set of pending/failed source_configs rows for this desk, so it fully replaces local
// state rather than merging (there's no streamed sub-state to preserve across polls, unlike
// voice extraction's reasoning/tool-activity accumulation).
import { useEffect, useRef, useState } from "react";
import { getWebsiteOnboardingStatus } from "@/app/agents/[id]/setup/actions";

const POLL_INTERVAL_MS = 2000;

export type WebsiteOnboardingEntry = { url: string; status: string; errorCode?: string };

export function useWebsiteOnboardingStatus(
  deskId: string,
  options: { enabled: boolean },
): WebsiteOnboardingEntry[] {
  const [entries, setEntries] = useState<WebsiteOnboardingEntry[]>([]);
  const enabledRef = useRef(options.enabled);
  enabledRef.current = options.enabled;

  useEffect(() => {
    if (!options.enabled) return;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      const result = await getWebsiteOnboardingStatus(deskId);
      if (cancelled) return;
      setEntries(result);
    }

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [deskId, options.enabled]);

  return entries;
}
