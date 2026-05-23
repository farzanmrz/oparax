"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Logout01Icon } from "@hugeicons/core-free-icons"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"

export function NavUser({
  user,
}: {
  user: {
    email: string
    name: string
  }
}) {
  const initialsSource = user.name || user.email
  const initials = initialsSource
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .padEnd(2, initialsSource[0] ?? "O")
    .slice(0, 2)
    .toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          asChild
          className="h-12 cursor-default border border-sidebar-border/70 bg-sidebar-accent/35 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground active:bg-sidebar-accent/35 active:text-sidebar-foreground"
        >
          <div>
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-background text-xs font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/55">
                {user.email}
              </span>
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function SidebarSignOut() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip="Sign out"
          disabled={pending}
          onClick={() => {
            void handleSignOut()
          }}
        >
          <HugeiconsIcon
            icon={Logout01Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          <span>{pending ? "Signing out..." : "Sign out"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
