"use client";

import { useState } from "react";
import { XIcon } from "@/components/icons";
import { startXConnect } from "@/lib/x/link-identity";

/**
 * Design-system "Connect X account" button for the connect-x landing. Reuses
 * the shared link routine (lib/x/link-identity.ts); shows the in-button spinner
 * while the OAuth handoff is starting (the button stays primary-white and
 * non-clickable via `.loading`, matching the landing's login button). The X
 * glyph inherits `currentColor`, so it renders dark on the white button.
 * @param props.nextPath - safe in-app path to return to after X connects
 */
export function ConnectXButton({ nextPath }: { nextPath: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (pending) return;
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
    <div>
      <button
        type="button"
        className={`btn btn-primary ws-connect-btn${pending ? " loading" : ""}`}
        onClick={connect}
      >
        <span className="ld" />
        {!pending && <XIcon width={16} height={16} />}
        <span>Connect X account</span>
      </button>
      {error && (
        <p
          className="ferr show"
          style={{
            margin: "8px 0 0",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
