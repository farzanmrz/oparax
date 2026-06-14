// Imports
import Link from "next/link"

// The settings sections, in display order — the single source of truth shared
// with the page's `?section=` validation. The slug is the `?section=` value.
export const SETTINGS_SECTIONS = [
  { slug: "profile", label: "Profile" },
  { slug: "billing", label: "Billing" },
  { slug: "security", label: "Security" },
  { slug: "notifications", label: "Notifications" },
] as const

// A valid settings section slug.
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["slug"]

/**
 * Tab-style navigation for the settings sections. Each tab is a plain Link that
 * sets `?section=`, so this stays a server component (no client hooks); the
 * active tab is derived from the prop the page already resolved.
 * @param props.activeSection - currently selected section slug
 * @returns the settings tab navigation
 */
export function SettingsTabNav({
  activeSection,
}: {
  activeSection: SettingsSection
}) {
  return (
    <nav className="ws-tabs">
      {SETTINGS_SECTIONS.map(({ slug, label }) => {
        const isActive = slug === activeSection
        return (
          <Link
            key={slug}
            href={`?section=${slug}`}
            aria-current={isActive ? "page" : undefined}
            className={`ws-tab${isActive ? " is-active" : ""}`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
