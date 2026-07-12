"use client";

import { LogOutIcon, NewspaperIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { OparaxMark } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";

/**
 * App chrome for /agents/*: a collapsible offcanvas sidebar replacing the old
 * global top header. Header is the brand link, content is the section nav
 * (one item for now), and the footer is deliberately FLAT — an identity row,
 * a Settings link, and Sign out — no dropdown menu. Sign-out behavior is
 * ported verbatim from the retired user-menu.tsx (signOut -> push "/" ->
 * refresh to bust the client router cache so Back can't restore a signed-in
 * view).
 */
export function AppSidebar({ username }: { readonly username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);

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

  const initials = username
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link className="font-semibold tracking-tight" href="/agents">
                <OparaxMark className="!size-5 text-foreground" />
                Oparax
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={agentsActive}>
              <Link aria-current={agentsActive ? "page" : undefined} href="/agents">
                <NewspaperIcon />
                Agents
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Identity row — non-interactive, just who's signed in. */}
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 truncate text-sm font-medium">{username}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/agents/settings")}>
              <Link href="/agents/settings">
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
    </Sidebar>
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
