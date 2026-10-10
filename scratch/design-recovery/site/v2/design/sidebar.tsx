"use client";

import { Bell, BookMarked, ChevronDown, ChevronsUpDown, List, PanelLeft, Settings, Sun } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { OparaxMark } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { groups, HANDLE, sources, type Group } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { profile } from "@/next/data/onboarding";
import { hue } from "@/v2/one/shell";
import { Gallery, Way } from "./shared";

// Three sidebars with the owner's structure (Oct 10): the word mark at the top opens the feed; Feed, Settings and
// Notifications in one place; the four kinds as the feed's components, headers with their names indented, with no
// Feed parent above them; the bottom is Hide, the person and Sign out. A: the One's rail with the bottom as blocks
// told apart by air and a darker foot (the council's answer). B: shadcn/ui's Sidebar as shipped (groups with
// labels, menu rows, footer). C: React Bits app-sidebar-1's anatomy on our tokens (uppercase section labels,
// "Collapse sidebar" above the person row).

const present = groups.filter((g) => sources.some((s) => s.group === g.id));
const NAV = [
  { label: "Feed", Icon: List, on: true },
  { label: "Settings", Icon: Settings, on: false },
  { label: "Notifications", Icon: Bell, on: false },
];
const frame = "h-[760px] w-[248px] shrink-0 overflow-hidden border border-line bg-[var(--rail)]";
const selected = "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]";
const row = "mx-2 flex h-8 items-center gap-[5px] rounded-lg px-2 text-[13px] font-medium";

function Mark({ s }: { s: (typeof sources)[number] }) {
  return s.group === "github" ? <BookMarked className="size-4 shrink-0 text-t3" strokeWidth={1.75} /> : <SourceMark source={s} size={16} className={s.group === "x" ? "" : "rounded-[4px]"} />;
}

function Head() {
  return (
    <div className="flex h-14 items-center gap-2 border-b border-line py-3 pr-3 pl-4">
      <OparaxMark className="size-[18px] text-t1" />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-t1">Oparax</span>
      <Sun className="ml-auto size-4 text-t3" />
    </div>
  );
}

function Kinds({ inset = false, limit = 4 }: { inset?: boolean; limit?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {present.map((g) => (
        <section key={g.id} className="flex flex-col gap-[2px]">
          <p className={cn("flex h-8 items-center gap-2 text-[15px] font-semibold text-t1", inset ? "pr-4 pl-8" : "px-4")}>
            <GroupGlyph group={g.id} className={cn("size-4", hue[g.id])} />
            <span className="flex-1 truncate">{g.label}</span>
            <span className="font-mono text-[11px] font-normal text-t3">{sources.filter((s) => s.group === g.id).length}</span>
            <ChevronDown className="size-3 text-t4" />
          </p>
          {sources
            .filter((s) => s.group === g.id)
            .slice(0, limit)
            .map((s) => (
              <p key={s.id} className={cn("mx-2 flex h-[30px] items-center gap-2 rounded-lg text-[13px] text-t2", inset ? "pr-2 pl-6" : "px-2")}>
                <Mark s={s} />
                <span className="truncate">{s.name}</span>
              </p>
            ))}
        </section>
      ))}
    </div>
  );
}

/* A: air blocks and a darker foot */
function WayA() {
  return (
    <div className={cn(frame, "flex flex-col")}>
      <Head />
      <nav className="flex flex-col gap-[2px] pt-2 pb-1">
        {NAV.map(({ label, Icon, on }) => (
          <p key={label} className={cn(row, on ? selected : "text-t2")}>
            <Icon className={cn("size-[15px]", on ? "text-[var(--brand)]" : "text-t3")} />
            {label}
          </p>
        ))}
      </nav>
      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        <Kinds limit={3} />
      </div>
      <div className="flex shrink-0 flex-col pt-4">
        <p className="mx-2 flex h-8 items-center gap-2 px-1.5 text-[13px] text-t2">
          <PanelLeft className="size-4 text-t3" />
          Hide sidebar
        </p>
        <div className="mt-2 flex items-center gap-2.5 bg-[var(--well)] px-4 py-3">
          <span className="grid size-7 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-semibold text-white">{profile.name[0]}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-[18px] font-semibold text-t1">{profile.name}</span>
            <span className="block truncate text-[11.5px] leading-4 text-t3">@{HANDLE}</span>
          </span>
          <span className="text-[12.5px] text-t2">Sign out</span>
        </div>
      </div>
    </div>
  );
}

/* B: shadcn/ui Sidebar as shipped */
function WayB() {
  return (
    <div className={cn(frame, "bg-sidebar")}>
      <SidebarProvider className="min-h-0" style={{ "--sidebar-width": "248px" } as React.CSSProperties}>
        <Sidebar collapsible="none" className="h-[758px]">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg">
                  <OparaxMark className="size-[18px]" />
                  <span className="font-semibold">Oparax</span>
                  <Sun className="ml-auto size-4 opacity-60" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Pages</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map(({ label, Icon, on }) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton isActive={on}>
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Sources</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {present.map((g) => (
                    <SidebarMenuItem key={g.id}>
                      <SidebarMenuButton>
                        <GroupGlyph group={g.id as Group} className={cn("size-4", hue[g.id])} />
                        <span className="font-semibold">{g.label}</span>
                        <ChevronDown className="ml-auto size-3 opacity-50" />
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {sources
                          .filter((s) => s.group === g.id)
                          .slice(0, 3)
                          .map((s) => (
                            <SidebarMenuSubItem key={s.id}>
                              <SidebarMenuSubButton>
                                <Mark s={s} />
                                <span>{s.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <PanelLeft />
                  <span>Hide sidebar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg">
                  <span className="grid size-7 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-semibold text-white">{profile.name[0]}</span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-[13px] font-semibold">{profile.name}</span>
                    <span className="truncate text-[11.5px] opacity-70">@{HANDLE}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 opacity-60" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    </div>
  );
}

/* C: React Bits app-sidebar-1's anatomy on our tokens */
function Label({ children }: { children: string }) {
  return <p className="px-4 pt-4 pb-1 text-[11px] font-semibold tracking-[0.08em] text-t3 uppercase">{children}</p>;
}

function WayC() {
  return (
    <div className={cn(frame, "flex flex-col")}>
      <Head />
      <div className="min-h-0 flex-1 overflow-hidden">
        <Label>Pages</Label>
        <nav className="flex flex-col gap-[2px]">
          {NAV.map(({ label, Icon, on }) => (
            <p key={label} className={cn(row, on ? selected : "text-t2")}>
              <Icon className={cn("size-[15px]", on ? "text-[var(--brand)]" : "text-t3")} />
              {label}
            </p>
          ))}
        </nav>
        <Label>Sources</Label>
        <Kinds limit={3} />
      </div>
      <div className="shrink-0 border-t border-line">
        <p className="mx-2 mt-2 flex h-8 items-center gap-2 px-1.5 text-[13px] text-t2">
          <PanelLeft className="size-4 text-t3" />
          Collapse sidebar
        </p>
        <div className="mx-2 mt-1 mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-raised">
          <span className="grid size-8 place-items-center rounded-full bg-[var(--brand)] text-[12px] font-semibold text-white">{profile.name[0]}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-[18px] font-semibold text-t1">{profile.name}</span>
            <span className="block truncate text-[11.5px] leading-4 text-t3">@{HANDLE}</span>
          </span>
          <ChevronsUpDown className="size-4 text-t3" />
        </div>
      </div>
    </div>
  );
}

export function SidebarGallery() {
  return (
    <Gallery
      title="The sidebar, three ways"
      note="Each has the structure you named: the word mark at the top opens the feed, Feed, Settings and Notifications together, the four kinds as the feed's parts with their names indented, and the bottom with Hide, you and Sign out. A is the council's answer: blocks told apart by air and a darker foot. B is shadcn/ui's Sidebar as shipped. C is React Bits app-sidebar-1's anatomy on our colours: small section labels, Collapse above the person row, Sign out inside the person row's menu."
    >
      <Way letter="A" name="Air blocks" from="the One's rail, council Oct 10" className="flex-none">
        <WayA />
      </Way>
      <Way letter="B" name="shadcn Sidebar" from="shadcn/ui sidebar.tsx" className="flex-none">
        <WayB />
      </Way>
      <Way letter="C" name="Sections" from="React Bits app-sidebar-1" className="flex-none">
        <WayC />
      </Way>
    </Gallery>
  );
}
