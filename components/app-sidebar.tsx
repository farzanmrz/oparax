"use client"

import {
  Settings02Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"
import { NavMain } from "@/components/nav-main"
import { NavUser, SidebarSignOut } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Prompt lab",
    url: "/dashboard/test",
    icon: TestTube01Icon,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings02Icon,
  },
]

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { email: string; name: string }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-3 border-b border-sidebar-border/80 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard/test">
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">
                  O
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-base font-semibold">Oparax</span>
                  <span className="truncate text-xs text-sidebar-foreground/55">
                    newsroom automation
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0" />
        <NavUser user={user} />
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/80 p-3">
        <SidebarSignOut />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
