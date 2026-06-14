"use client"

// Workspace shell — the graphite collapsible sidebar + main slot, ported from
// the Claude Design prototype (oparax-ds AgentsHome). Rendered once by
// app/dashboard/layout.tsx so every dashboard page shares it. Connection-aware
// (the X account row reflects whether X is linked) and route-aware (active nav
// from usePathname). Surfaces/dimensions live in app/workspace.css (scoped under
// `.workspace`); the `sc-if expanded` conditionals became React conditional
// renders driven by collapse state.
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import "@/app/workspace.css"
import { createClient } from "@/lib/supabase/client"
import { OparaxMark } from "@/components/logo"
import {
  AgentIcon,
  BlueskyTile,
  ChevronLeftIcon,
  ChevronRightIcon,
  FacebookTile,
  GearIcon,
  GlobeTile,
  InsightsIcon,
  InstagramTile,
  LinkedInTile,
  MastodonTile,
  ProfileIcon,
  RedditTile,
  SignOutIcon,
  ThreadsTile,
  TikTokTile,
  WhatsAppTile,
  XTile,
} from "@/components/dashboard/shell-icons"

// "Coming soon" destinations under the live X account — order from the prototype.
const SOON_ACCOUNTS: {
  Tile: React.ComponentType<React.SVGProps<SVGSVGElement>>
  text: string
}[] = [
  { Tile: InstagramTile, text: "Coming soon" },
  { Tile: LinkedInTile, text: "Coming soon" },
  { Tile: TikTokTile, text: "Coming soon" },
  { Tile: FacebookTile, text: "Coming soon" },
  { Tile: WhatsAppTile, text: "Coming soon" },
  { Tile: ThreadsTile, text: "Coming soon" },
  { Tile: RedditTile, text: "Coming soon" },
  { Tile: BlueskyTile, text: "Coming soon" },
  { Tile: MastodonTile, text: "Coming soon" },
  { Tile: GlobeTile, text: "Coming soon" },
]

export function WorkspaceShell({
  username,
  xUsername,
  children,
}: {
  username: string
  xUsername: string | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const expanded = !collapsed

  // Agents is the only live nav destination: active on the agents pages and on
  // the connect-x landing (which is the not-connected agents view). When X isn't
  // linked the link points at the gate so the user can't slip past it.
  const agentsActive =
    pathname === "/dashboard/connect-x" || pathname.startsWith("/dashboard/agents")
  const agentsHref = xUsername ? "/dashboard/agents" : "/dashboard/connect-x"

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="workspace">
      <aside className="ws-aside" data-collapsed={collapsed}>
        <button
          type="button"
          className="ws-toggle"
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((c) => !c)}
        >
          {expanded ? (
            <ChevronLeftIcon width={16} height={16} />
          ) : (
            <ChevronRightIcon width={16} height={16} />
          )}
        </button>

        <div className="ws-brand j-row">
          <span className="ws-badge">
            <OparaxMark width={14} height={14} />
          </span>
          {expanded && <span className="ws-wordmark">Oparax</span>}
        </div>

        <div className="ws-scroll">
          <nav className="ws-nav">
            <Link
              href={agentsHref}
              className={`ws-navitem j-row${agentsActive ? " is-active" : " ws-navitem-idle"}`}
              aria-current={agentsActive ? "page" : undefined}
            >
              <AgentIcon width={22} height={22} />
              {expanded && <span>Agents</span>}
            </Link>
            <span className="ws-navitem is-disabled j-row">
              <InsightsIcon width={22} height={22} />
              {expanded && (
                <>
                  <span className="ws-navitem-label">Insights</span>
                  <span className="ws-soon">Soon</span>
                </>
              )}
            </span>
            <span
              className="ws-navitem ws-navitem-idle j-row"
              aria-disabled="true"
            >
              <ProfileIcon width={22} height={22} />
              {expanded && <span>Profile</span>}
            </span>
          </nav>

          <div className="ws-section">
            {expanded && <div className="ws-section-label">Accounts</div>}
            <div className="ws-acct-list">
              <div className="acct-row j-row" data-state={xUsername ? "ok" : "err"}>
                <XTile className="acct-icon" width={22} height={22} />
                {expanded && (
                  <span className="acct-text">
                    {xUsername ? `@${xUsername}` : "Not connected"}
                  </span>
                )}
              </div>
              {SOON_ACCOUNTS.map(({ Tile, text }, i) => (
                <div key={i} className="acct-row j-row" data-state="soon">
                  <Tile className="acct-icon" width={22} height={22} />
                  {expanded && <span className="acct-text">{text}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ws-foot">
          {menuOpen && (
            <>
              <div
                className="ws-menu-scrim"
                onClick={() => setMenuOpen(false)}
              />
              <div className="ws-menu">
                <Link
                  href="/dashboard/settings"
                  className="ws-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <GearIcon width={16} height={16} />
                  Settings
                </Link>
                <button
                  type="button"
                  className="ws-menu-item"
                  disabled={signingOut}
                  onClick={() => {
                    setMenuOpen(false)
                    void signOut()
                  }}
                >
                  <SignOutIcon width={16} height={16} />
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
                <div className="ws-menu-div" />
                <a href="#" className="ws-menu-link">Contact us</a>
                <a href="#" className="ws-menu-link">Terms of service</a>
                <a href="#" className="ws-menu-link">Privacy policy</a>
              </div>
            </>
          )}

          <div className="ws-user j-row">
            <span className="ws-avatar" />
            {expanded && (
              <>
                <span className="ws-username">{username}</span>
                <button
                  type="button"
                  className="ws-gear"
                  aria-label="Account menu"
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <GearIcon width={16} height={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      <main className="ws-main">
        <div className="ws-main-inner">
          <div className="ws-main-max">{children}</div>
        </div>
      </main>
    </div>
  )
}
