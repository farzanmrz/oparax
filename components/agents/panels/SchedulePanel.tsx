"use client";

import type { Agent } from "@/lib/types";

// Filled in Stage C (scheduling + autonomy). Placeholder keeps the tab shell stable so
// Stage C edits ONLY this file.
export function SchedulePanel({ agent }: { agent: Agent }) {
  return (
    <p style={{ margin: 0, font: "400 0.9375rem/1.5 var(--font-sans)", color: "var(--muted)" }}>
      Scheduling and autonomous posting for <strong>{agent.name}</strong> arrive in the next update.
    </p>
  );
}
