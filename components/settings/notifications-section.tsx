"use client"

// Imports
import { useState } from "react"

// The notification rows. UI-only this sprint: toggles are local state that
// persist nothing. `key` keeps the local on/off map stable.
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
 * — each switch is local React state and persists nothing this sprint. Client
 * island so the toggles are interactive.
 * @returns the notifications section
 */
export function NotificationsSection() {
  // Local on/off map seeded from the row defaults.
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ROWS.map((r) => [r.key, r.on])),
  )

  return (
    <section id="notifications" className="card-sec set-sec">
      <h2 className="sec-title">Notifications</h2>

      <div className="set-rows">
        {ROWS.map((row) => {
          const on = state[row.key]
          return (
            <div className="arow" key={row.key}>
              <div className="grow">
                <div className="rt">{row.title}</div>
                <div className="rs">{row.sub}</div>
              </div>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={on}
                aria-label={row.title}
                data-on={on ? "true" : "false"}
                onClick={() =>
                  setState((prev) => ({ ...prev, [row.key]: !prev[row.key] }))
                }
              >
                <span className="knob" />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
