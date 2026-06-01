// Imports
import Link from "next/link"
import { cn } from "@/lib/utils"

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
    <nav className="flex gap-1 border-b border-border">
      {SETTINGS_SECTIONS.map(({ slug, label }) => {
        const isActive = slug === activeSection
        return (
          <Link
            key={slug}
            href={`?section=${slug}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
