// Imports
import { ConnectX } from "@/components/loop/connect-x"
import { DisconnectXButton } from "@/components/loop/disconnect-x-button"

/**
 * Connections settings section (id="connections"): manages the linked X account.
 * This is the simple shell — issue #25 replaces the inner content with split
 * connection pills. For now it keeps the working wiring: ConnectX when no account
 * is linked, a "connected as" line + DisconnectXButton when one is, and surfaces
 * any X connect/callback error. Server-safe (the interactive bits are their own
 * client islands).
 * @param props.xUsername - connected X handle, if any
 * @param props.xError - X connect/callback error to surface, if any
 * @param props.agentCount - saved agents affected by disconnecting X
 * @returns the connections section
 */
export function ConnectionsSection({
  xUsername,
  xError,
  agentCount,
}: {
  xUsername?: string
  xError?: string
  agentCount: number
}) {
  return (
    <section id="connections" className="card-sec set-sec">
      <h2 className="sec-title">Connections</h2>

      {xUsername ? (
        <div className="ws-account-actions">
          <p className="ws-connected-line">
            Connected as <b>@{xUsername}</b>
          </p>
          <DisconnectXButton agentCount={agentCount} />
        </div>
      ) : (
        <ConnectX />
      )}

      {xError && (
        <p className="ferr show" style={{ marginTop: 10 }}>
          {xError}
        </p>
      )}
    </section>
  )
}
