// The notification rows. UI-only this sprint: the toggles are inert (disabled)
// and show their default on/off look only. `key` keeps the rows stable.
const ROWS = [
  {
    key: "breaking",
    title: "Breaking-story alerts",
    sub: "Get notified the moment a story breaks on your beat.",
    on: true,
  },
  {
    key: "drafts",
    title: "Draft-ready emails",
    sub: "Email me when an agent finishes drafting a run.",
    on: true,
  },
  {
    key: "product",
    title: "Product updates",
    sub: "Occasional news about new Oparax features.",
    on: false,
  },
] as const

/**
 * Notifications settings section (id="notifications"): a few toggle rows. UI-only
 * this sprint — the switches are disabled (greyed, non-interactive) and persist
 * nothing; a "Coming soon" hint under the title makes that clear. Server-safe
 * (no client state).
 * @returns the notifications section
 */
export function NotificationsSection() {
  return (
    <section id="notifications" className="card-sec set-sec">
      <h2 className="sec-title">Notifications</h2>
      <p className="set-soon-hint">Coming soon — these controls aren&apos;t active yet.</p>

      <div className="set-rows">
        {ROWS.map((row) => (
          <div className="arow" key={row.key}>
            <div className="grow">
              <div className="rt">{row.title}</div>
              <div className="rs">{row.sub}</div>
            </div>
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={row.on}
              aria-label={row.title}
              data-on={row.on ? "true" : "false"}
              disabled
            >
              <span className="knob" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
