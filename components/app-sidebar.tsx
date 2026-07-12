"use client";

import { ArrowLeftIcon, BotIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { OparaxMark } from "@/components/logo";
import { PeekSidebar, PeekSidebarTrigger } from "@/components/sidebar-peek";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";

/**
 * App chrome for /agents/*: a collapsible offcanvas sidebar replacing the old
 * global top header. Three visually distinct zones sharing ONE indent grid
 * (every row is `gap-2 px-2`, icon/avatar slots are 16px wide):
 *   1. Brand — non-interactive logo + wordmark, separated by a hairline.
 *   2. Nav — the interactive section menu.
 *   3. Footer — hairline, then a muted identity row, Settings, Sign out.
 * Sign-out behavior is ported verbatim from the retired user-menu.tsx
 * (signOut -> push "/" -> refresh to bust the client router cache so Back
 * can't restore a signed-in view).
 */
export function AppSidebar({ username }: { readonly username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [pending, setPending] = useState(false);

  // On mobile the sidebar is a modal sheet that outlives client navigation
  // (the layout stays mounted), so nav links must dismiss it themselves —
  // the retired dropdown menu auto-closed on select. No-op on desktop.
  const closeMobileSidebar = () => setOpenMobile(false);

  async function signOut() {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      // Invalidate the client router cache (incl. bfcache): without this, the
      // browser Back button can restore a signed-in dashboard payload with no
      // server round-trip after sign-out.
      router.refresh();
    } catch {
      // Sign-out failed (network/transient) — re-enable the control to retry
      // instead of leaving it stuck on "Signing out…".
      setPending(false);
    }
  }

  // "Agents" covers the listing, /new and /[id] — but not /agents/settings.
  const agentsActive =
    pathname === "/agents" || pathname.startsWith("/agents/new") || isAgentDetail(pathname);
  // Exact segment match — a desk id like "settings-desk" is a detail route,
  // not the settings page (same reasoning as isAgentDetail below).
  const settingsActive =
    pathname === "/agents/settings" || pathname.startsWith("/agents/settings/");

  const initials = username
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <PeekSidebar collapsible="offcanvas">
      {/* Brand zone — deliberately NOT a menu button: it's identity, not nav.
          Same px-2/gap-2 grid as the menu rows below so the mark lines up
          with the nav icons. */}
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2 px-2">
          <span className="flex w-4 justify-center">
            <OparaxMark className="size-4 text-foreground" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Oparax</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="mx-2" />

      <SidebarContent className="pt-2">
        <nav aria-label="Primary">
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={agentsActive}>
                <Link
                  aria-current={agentsActive ? "page" : undefined}
                  href="/agents"
                  onClick={closeMobileSidebar}
                >
                  <BotIcon />
                  Agents
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </nav>
      </SidebarContent>

      <SidebarSeparator className="mx-2" />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Identity row — non-interactive, muted so it reads as a label
                rather than another button. Avatar sits in the same 16px icon
                slot as the icons above it. */}
            <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 p-2">
              <Avatar className="size-4">
                <AvatarFallback className="bg-primary/15 text-[8px] font-semibold text-primary">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 truncate text-sm text-muted-foreground">{username}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={settingsActive}>
              <Link
                aria-current={settingsActive ? "page" : undefined}
                href="/agents/settings"
                onClick={closeMobileSidebar}
              >
                <SettingsIcon />
                Settings
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10 active:text-destructive"
              disabled={pending}
              onClick={() => void signOut()}
              type="button"
            >
              <LogOutIcon />
              {pending ? "Signing out…" : "Sign out"}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </PeekSidebar>
  );
}

/**
 * Leading chrome for every /agents/* page header: the sidebar trigger (with
 * hover-peek) and a hairline divider. One shared copy so the -ml-1.5 optical
 * alignment and divider styling can't drift per page — render it as the first
 * child of a `flex items-center` header row.
 */
export function AppSidebarTrigger() {
  return (
    <>
      <PeekSidebarTrigger className="-ml-1.5" />
      <span aria-hidden="true" className="h-4 w-px bg-border" />
    </>
  );
}

/**
 * Secondary-page header lead: the trigger cluster plus a back link to the
 * agents listing — one shared copy for the [id] dashboard and settings so
 * their stacked headers can't drift apart.
 */
export function AppSidebarBackRow() {
  return (
    <div className="mb-3 flex items-center gap-3">
      <AppSidebarTrigger />
      <Link
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        href="/agents"
      >
        <ArrowLeftIcon className="size-4" />
        Agents
      </Link>
    </div>
  );
}

// A detail route (/agents/<id>) but not /agents/new or /agents/settings.
// Match the first path segment exactly so an id like "newsdesk" isn't
// mistaken for the /agents/new route.
function isAgentDetail(pathname: string): boolean {
  if (!pathname.startsWith("/agents/")) return false;
  const segment = pathname.slice("/agents/".length).split("/")[0];
  return segment.length > 0 && segment !== "new" && segment !== "settings";
}
