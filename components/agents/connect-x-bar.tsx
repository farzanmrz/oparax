"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isSafeNextPath } from "@/lib/safe-next";
import { startXConnect } from "@/lib/x/link-identity";

/**
 * Inline connect-X bar for the agent-details Post intent. Opens the OAuth round-trip with a
 * ?next= back to this agent (clamped by isSafeNextPath) so after consent the reporter lands
 * back on the draft they tried to post. NOT a toast (spec §5.3).
 */
export function ConnectXBar({ message, nextPath }: { message: string; nextPath: string }) {
  const [busy, setBusy] = useState(false);
  const safeNext = isSafeNextPath(nextPath) ? nextPath : "/dashboard/agents";

  const handleConnect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await startXConnect(safeNext); // redirects to X; returns to ?next=safeNext
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start X connection.");
      setBusy(false);
    }
  }, [busy, safeNext]);

  return (
    <div className="ws-connect-bar">
      <span className="ws-connect-msg">{message}</span>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleConnect}
        disabled={busy}
        style={{ flexShrink: 0 }}
      >
        {busy ? "Connecting…" : "Connect X"}
      </button>
    </div>
  );
}
