// Imports
import { XConnectionPill } from "@/components/settings/x-connection-pill"
import {
  InstagramTile,
  LinkedInTile,
  RedditTile,
  BlueskyTile,
  FacebookTile,
  WhatsAppTile,
  ThreadsTile,
  TikTokTile,
  MastodonTile,
} from "@/components/dashboard/shell-icons"

// The greyed "Soon" pills — one per not-yet-supported platform. The logo
// carries identity (no platform name), matching the export. Non-interactive:
// `.pill[data-soon="true"]` dims them + sets cursor:default.
const SOON_PLATFORMS = [
  { key: "instagram", label: "Instagram", Tile: InstagramTile },
  { key: "linkedin", label: "LinkedIn", Tile: LinkedInTile },
  { key: "reddit", label: "Reddit", Tile: RedditTile },
  { key: "bluesky", label: "Bluesky", Tile: BlueskyTile },
  { key: "facebook", label: "Facebook", Tile: FacebookTile },
  { key: "whatsapp", label: "WhatsApp", Tile: WhatsAppTile },
  { key: "threads", label: "Threads", Tile: ThreadsTile },
  { key: "tiktok", label: "TikTok", Tile: TikTokTile },
  { key: "mastodon", label: "Mastodon", Tile: MastodonTile },
] as const

/**
 * Connections settings section (id="connections", kept for the #23 scroll-spy):
 * a flat flex-wrap list of split connection pills (the export design). The X
 * pill is the only real/interactive connection — connect/disconnect behavior
 * lives in the XConnectionPill client island; every other platform is a greyed
 * non-interactive "Soon" pill. Surfaces any X connect/callback error near the X
 * pill. Server-safe wrapper (only XConnectionPill is a client component).
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

      <div className="set-pills">
        <XConnectionPill xUsername={xUsername} agentCount={agentCount} />

        {xError && (
          <p className="ferr show" style={{ flexBasis: "100%", marginTop: 0 }}>
            {xError}
          </p>
        )}

        {SOON_PLATFORMS.map(({ key, label, Tile }) => (
          <span
            key={key}
            className="pill"
            data-soon="true"
            title={`${label} — coming soon`}
            aria-label={`${label} — coming soon`}
          >
            <span className="pill-logo">
              <Tile />
            </span>
            <span className="pill-body" style={{ color: "var(--faint)" }}>
              Soon
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}
