import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { frame, Logo, Page, SiteFooter } from "../frame";
import { ThemeToggle } from "../theme";
import { feedCopy } from "../copy";
import { profile } from "../data/onboarding";
import { hrefFor, type FeedOptions } from "./model";
import { FeedAside, FeedList, FeedTitle, PlanBanner, PreviewNote, ViewSwitch, viewIcon } from "./parts";
import { ReadyPanel } from "./ready-panel";

function FeedBody({ options }: { options: FeedOptions }) {
  const showNote = options.state !== "empty" && !options.first;
  return (
    <>
    {showNote ? <div className="mt-5"><PreviewNote /></div> : null}
    <div className="mt-5 grid grid-cols-[minmax(0,1fr)_320px] gap-10">
      <div className="min-w-0 max-w-[800px] space-y-4">
        <PlanBanner plan={options.plan} />
        {options.first ? <ReadyPanel /> : null}
        <FeedList options={options} />
      </div>
      <FeedAside options={options} />
    </div>
    </>
  );
}

/** Simple page: the normal header, Direct/Clustered beside the "Your Feed" title. */
export function FeedPage({ options, base = "/next/feed/page" }: { options: FeedOptions; base?: string }) {
  return (
    <Page header="member">
      <div className={cn(frame, "py-10")}>
        <FeedTitle options={options}>
          <ViewSwitch base={base} options={options} />
        </FeedTitle>
        <FeedBody options={options} />
      </div>
    </Page>
  );
}

/** App shell (stock shadcn Sidebar): logo top left, the two views, then only what is real. */
export function FeedShell({ options }: { options: FeedOptions }) {
  const base = "/next/feed/shell";
  return (
    <SidebarProvider defaultOpen className="min-h-svh">
      <Sidebar collapsible="none" className="sticky top-0 h-svh w-60 border-r border-sidebar-border">
        <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="pt-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs">Views</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(["direct", "clustered"] as const).map((view) => {
                  const Icon = viewIcon[view];
                  return (
                    <SidebarMenuItem key={view}>
                      <SidebarMenuButton asChild isActive={options.view === view} className="h-9 text-sm">
                        <Link href={hrefFor(base, options, { view, story: null })}>
                          <Icon aria-hidden="true" />
                          {feedCopy[view]}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-1 border-t border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-9 text-sm">
                <Settings aria-hidden="true" />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-sm font-semibold"
              aria-hidden="true"
            >
              {profile.name[0]}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium">{profile.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{profile.handle}</span>
            </span>
            <ThemeToggle />
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-9 text-sm">
                <LogOut aria-hidden="true" />
                Log Out
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex min-h-svh flex-col">
        <div className="flex-1 px-12 py-10">
          <FeedTitle options={options} />
          <FeedBody options={options} />
        </div>
        <SiteFooter className="[&>div]:w-auto [&>div]:px-12" />
      </SidebarInset>
    </SidebarProvider>
  );
}
