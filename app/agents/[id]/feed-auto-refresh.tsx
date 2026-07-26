"use client";

// Keeps the Feed live without any realtime infrastructure. The Feed is a Server Component
// rendered once per navigation, so a post ingested while the reporter sat on the page was
// invisible until they reloaded — the "sources came in 19 minutes ago but only showed up
// now" report. `router.refresh()` re-runs the server render and diffs it in WITHOUT touching
// client state (open dialogs, an in-progress edit survive), so polling it is cheap and safe.
//
// Cadence: every 20s while the tab is visible, immediately on tab refocus, never while
// hidden. Supabase Realtime is not an option here by design — the pipeline tables are
// deny-all RLS, so a browser cannot subscribe to them (the same reason voice extraction
// polls; see AGENTS.md). If per-second latency ever matters, the upgrade path is a server
// push, not loosening RLS.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 20_000;

export function FeedAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router]);

  return null;
}
