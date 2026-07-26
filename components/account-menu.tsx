"use client";

import { LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

/**
 * Site-header account menu: a circular initials avatar opening an identity +
 * Settings + Sign out dropdown. Sign-out behavior is ported verbatim from the
 * retired components/app-sidebar.tsx (lines 44-59): sign out, push "/", then
 * refresh to bust the client router cache (incl. bfcache) so Back can't
 * restore a signed-in view after sign-out.
 */
export function AccountMenu({ username }: { readonly username: string }) {
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

  const initials = username
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex size-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <Avatar>
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-58">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
          <span className="truncate text-sm font-medium text-foreground">{username}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">@{username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/agents/settings">
            <SettingsIcon />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
          variant="destructive"
        >
          <LogOutIcon />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
