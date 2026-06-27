"use client";

// Workspace shell — the graphite collapsible sidebar + main slot, ported from
// the Claude Design prototype (oparax-ds AgentsHome / sidebar.html). Rendered
// once by app/dashboard/layout.tsx so every dashboard page shares it.
// Connection-aware (Agents gates on whether X is linked) and route-aware (active
// nav from usePathname). Surfaces/dimensions live in app/workspace.css (scoped
// under `.workspace`); the DS classes (.nav-main / .snav / .you-line /
// .foot-signout) come from app/globals.css. The `sc-if expanded` conditionals
// became React conditional renders driven by collapse state.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import "@/app/workspace.css";
import {
  AgentIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GearIcon,
  ProfileIcon,
  ShieldIcon,
  SignOutIcon,
} from "@/components/dashboard/shell-icons";
import { useUnsavedChanges } from "@/components/dashboard/unsaved-changes";
import { OparaxMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

// Settings sub-nav — one row per settings section. Connections now lives inside
// Profile, so the sub-nav is three rows (profile/notifications/account); the
// scroll-spy hook below tracks those ids.
const SETTINGS_SECTIONS: {
  id: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  {
    id: "profile",
    label: "Profile",
    Icon: ProfileIcon,
  },
  {
    id: "notifications",
    label: "Notifications",
    Icon: BellIcon,
  },
  {
    id: "account",
    label: "Account settings",
    Icon: ShieldIcon,
  },
];

// Scroll-spy: highlight the settings sub-nav item whose section is in view.
// Uses a "trigger-line" scan (the last section whose top has passed ~35% down
// the viewport) rather than a center-band IntersectionObserver, so the FIRST
// section lights at the top and the LAST one lights at the bottom — a short
// final section can't reach a center band when it sits at the page bottom.
// The settings page scrolls inside `.ws-main` (not the window), so we listen
// there. No-ops when no sections exist yet (they arrive in #24), falling back
// to the URL hash. `enabled` gates it to the settings route.
function useSettingsScrollSpy(enabled: boolean): string {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (!enabled) return;

    const ids = SETTINGS_SECTIONS.map((s) => s.id);
    // The settings page scrolls inside .ws-main, not the window.
    const scroller = document.querySelector<HTMLElement>(".ws-main");

    const compute = () => {
      const els = ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);

      // Sections absent (this branch, pre-#24): fall back to the URL hash.
      if (els.length === 0) {
        const hashId = window.location.hash.replace(/^#/, "");
        if (ids.includes(hashId)) setActive(hashId);
        return;
      }

      // At the container's bottom, a short final section can't push its top
      // past any upper trigger line — so activate the last section explicitly.
      if (scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
        setActive(els[els.length - 1].id);
        return;
      }

      // Otherwise: the last section whose heading has scrolled above a line near
      // the top of the viewport (defaults to the first section while at top).
      const triggerLine = window.innerHeight * 0.2;
      let current = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= triggerLine) current = el.id;
      }
      setActive(current);
    };

    compute();

    // Listen on .ws-main (the scroll container); also cover resize + hash nav.
    scroller?.addEventListener("scroll", compute, {
      passive: true,
    });
    window.addEventListener("resize", compute);
    window.addEventListener("hashchange", compute);

    return () => {
      scroller?.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
      window.removeEventListener("hashchange", compute);
    };
  }, [enabled]);

  // Gate the returned value so it's empty when the sub-nav isn't shown, without
  // a synchronous setState in the effect (which the lint rule forbids).
  return enabled ? active : "";
}

export function WorkspaceShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { confirmLeave } = useUnsavedChanges();
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const expanded = !collapsed;

  // Agents is the only live primary destination: active on the agents pages and
  // on the connect-x landing (which is the not-connected agents view).
  const agentsActive =
    pathname === "/dashboard/connect-x" || pathname.startsWith("/dashboard/agents");
  const agentsHref = "/dashboard/agents";

  const settingsActive = pathname.startsWith("/dashboard/settings");
  const activeSection = useSettingsScrollSpy(settingsActive && expanded);

  async function signOut() {
    if (!confirmLeave()) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
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
              className="nav-main j-row"
              data-active={agentsActive ? "true" : undefined}
              aria-current={agentsActive ? "page" : undefined}
              onClick={(e) => {
                if (!confirmLeave()) e.preventDefault();
              }}
            >
              <AgentIcon width={22} height={22} />
              {expanded && <span>Agents</span>}
            </Link>

            <Link
              href="/dashboard/settings"
              className="nav-main j-row"
              data-active={settingsActive ? "true" : undefined}
              aria-current={settingsActive ? "page" : undefined}
              onClick={(e) => {
                if (!confirmLeave()) e.preventDefault();
              }}
            >
              <GearIcon width={22} height={22} />
              {expanded && <span>Settings</span>}
            </Link>

            {settingsActive && expanded && (
              <div className="snav">
                {SETTINGS_SECTIONS.map(({ id, label, Icon }) => (
                  <Link
                    key={id}
                    href={`/dashboard/settings#${id}`}
                    className="snav-item"
                    data-active={activeSection === id ? "true" : undefined}
                    onClick={(e) => {
                      if (!confirmLeave()) e.preventDefault();
                    }}
                  >
                    <Icon width={16} height={16} />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </div>

        <div className="ws-foot">
          <Link
            href="/dashboard/settings#profile"
            className="you-line"
            onClick={(e) => {
              if (!confirmLeave()) e.preventDefault();
            }}
          >
            <span className="ws-avatar" />
            {expanded && <span className="ws-username">{username}</span>}
          </Link>
          <button
            type="button"
            className="foot-signout"
            aria-label="Sign out"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            <SignOutIcon width={18} height={18} />
          </button>
        </div>
      </aside>

      <main className="ws-main">
        <div className="ws-main-inner">
          <div className="ws-main-max">{children}</div>
        </div>
      </main>
    </div>
  );
}
