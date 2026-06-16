"use client";

// Imports
import { useState } from "react";
import { startXConnect } from "@/lib/x/link-identity";

/**
 * Connect-X control for the Settings page: starts the shared X link flow
 * (unlink stale identity → linkIdentity tweet.write → /auth/callback). The flow
 * itself lives in lib/x/link-identity.ts so this and the connect-x landing stay
 * in sync.
 * @param props.nextPath - in-app path to return to after X connects
 * @returns the Connect X button + any error
 */
export function ConnectX({ nextPath = "/dashboard/settings" }: { nextPath?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setPending(true);
    setError(null);
    try {
      await startXConnect(nextPath);
      // On success the browser redirects to X for consent.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start X connection.");
      setPending(false);
    }
  }

  return (
    <div className="ws-account-actions">
      <button
        type="button"
        className={`btn btn-primary${pending ? " loading" : ""}`}
        onClick={connect}
        disabled={pending}
      >
        <span className="ld" />
        Connect X
      </button>
      {error && (
        <p
          className="ferr show"
          style={{
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
