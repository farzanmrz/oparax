"use client";

import { Bell, KeyRound, Plus, Rss, Trash2, UserRound, X as CloseIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { groups, sources } from "@/v2/deck/data";
import { GroupGlyph, SourceMark } from "@/v2/deck/marks";
import { XLogo } from "@/pro/shared/brand";
import { hue } from "@/v2/one/shell";
import { Gallery, Way } from "./shared";

// The Settings page's structure, three ways (owner, Oct 10: sources, the account, notifications are "not the same in
// hierarchy"; the kind cards are "unnecessarily wide"; plans are a separate thing). Each way holds the same three
// areas with the band card: Sources (the kind cards, narrower), Notifications (Twitter DMs), Account (password,
// delete). A: one 720px column, the areas in order under section titles. B: an in-page nav at the left (React Bits
// settings-form-1), one area at a time. C: shadcn Tabs across the top, one area at a time.

const present = groups.filter((g) => sources.some((s) => s.group === g.id));

export function Band({ glyph, title, action, children, className }: { glyph: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn(lift, "overflow-hidden", className)} style={liftStyle}>
      <div className="flex h-11 items-center gap-2.5 bg-[var(--raised)] px-4">
        {glyph}
        <h3 className="text-[15px] font-semibold text-t1">{title}</h3>
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}

const small = "inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-[var(--window)] px-2.5 text-[12.5px] font-medium text-t2";

export function KindCards({ cols = 1 }: { cols?: 1 | 2 }) {
  return (
    <div className={cn("grid gap-4", cols === 2 && "md:grid-cols-2")}>
      {present.map((g) => (
        <Band
          key={g.id}
          glyph={<GroupGlyph group={g.id} className={cn("size-4", hue[g.id])} />}
          title={g.label}
          action={
            <span className={small} style={{ boxShadow: "var(--top-light)" }}>
              <Plus className="size-3.5" />
              Add
            </span>
          }
        >
          <ul>
            {sources
              .filter((s) => s.group === g.id)
              .slice(0, 4)
              .map((s) => (
                <li key={s.id} className="flex h-9 items-center gap-3 rounded-md px-2 hover:bg-raised">
                  <SourceMark source={s} size={18} className={s.group === "x" ? "" : "rounded-[4px]"} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-[13.5px] font-medium text-t1">{s.name}</span>
                    <span className="ml-2 text-[12.5px] text-t3">{s.handle}</span>
                  </span>
                  <span aria-label={`Remove ${s.name}`} className="grid size-7 shrink-0 place-items-center rounded-md text-t4 hover:bg-raised hover:text-[var(--error)]">
                    <CloseIcon className="size-3.5" aria-hidden="true" />
                  </span>
                </li>
              ))}
          </ul>
        </Band>
      ))}
    </div>
  );
}

export function Dms() {
  return (
    <Band glyph={<XLogo className="size-4 text-t1" />} title="Twitter DMs" action={<span className="text-[13px] text-t3">Not connected</span>}>
      <div className="px-2 py-1">
        <span className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground">
          <XLogo className="size-3.5" />
          Message @oparax_ai
        </span>
        <p className="mt-3 text-[13px] leading-[1.5] text-t2">Opens a message to @oparax_ai with "Start alerts" typed. Send it from @farzanmrz to connect alerts.</p>
      </div>
    </Band>
  );
}

export function Account() {
  return (
    <div className="grid gap-4">
      <Band glyph={<KeyRound className="size-4 text-t2" />} title="Password" action={<span className={small}>Change</span>}>
        <p className="px-2 py-1 text-[13px] text-t2">Last changed on September 30.</p>
      </Band>
      <Band glyph={<Trash2 className="size-4 text-[var(--error)]" />} title="Delete account" action={<span className={cn(small, "text-[var(--error)]")}>Delete</span>}>
        <p className="px-2 py-1 text-[13px] text-t2">Removes your agent, its sources and your account. This cannot be undone.</p>
      </Band>
    </div>
  );
}

function SectionTitle({ Icon, children, line }: { Icon: typeof Rss; children: string; line: string }) {
  return (
    <div className="mb-3">
      <p className="flex items-center gap-2 text-[17px] font-semibold text-t1">
        <Icon className="size-4 text-t3" />
        {children}
      </p>
      <p className="mt-0.5 text-[12.5px] text-t3">{line}</p>
    </div>
  );
}

const page = "min-h-[720px] w-[1104px] shrink-0 border border-line bg-[var(--page)] p-8";

/* A: one column, the areas in order */
function WayA() {
  return (
    <div className={page}>
      <h2 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Settings</h2>
      <div className="mx-auto mt-6 flex w-[720px] flex-col gap-10">
        <div>
          <SectionTitle Icon={Rss} line="What your agent watches. Add or remove any time.">
            Sources
          </SectionTitle>
          <KindCards />
        </div>
        <div>
          <SectionTitle Icon={Bell} line="How Oparax reaches you.">
            Notifications
          </SectionTitle>
          <Dms />
        </div>
        <div>
          <SectionTitle Icon={UserRound} line="Your sign-in and your data.">
            Account
          </SectionTitle>
          <Account />
        </div>
      </div>
    </div>
  );
}

/* B: in-page nav at the left, one area at a time */
function WayB() {
  const items = [
    { label: "Sources", Icon: Rss, on: true },
    { label: "Notifications", Icon: Bell, on: false },
    { label: "Account", Icon: UserRound, on: false },
  ];
  return (
    <div className={page}>
      <h2 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Settings</h2>
      <div className="mt-6 grid grid-cols-[200px_minmax(0,1fr)] gap-8">
        <nav className="flex flex-col gap-[2px]">
          {items.map(({ label, Icon, on }) => (
            <p key={label} className={cn("flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium", on ? "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]" : "text-t2")}>
              <Icon className={cn("size-4", on ? "text-[var(--brand)]" : "text-t3")} />
              {label}
            </p>
          ))}
        </nav>
        <div className="max-w-[760px]">
          <SectionTitle Icon={Rss} line="What your agent watches. Add or remove any time.">
            Sources
          </SectionTitle>
          <KindCards cols={2} />
        </div>
      </div>
    </div>
  );
}

/* C: tabs across the top */
function WayC() {
  return (
    <div className={page}>
      <h2 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Settings</h2>
      <Tabs defaultValue="sources" className="mt-5">
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="mt-5 max-w-[840px]">
          <KindCards cols={2} />
        </TabsContent>
        <TabsContent value="notifications" className="mt-5 max-w-[640px]">
          <Dms />
        </TabsContent>
        <TabsContent value="account" className="mt-5 max-w-[640px]">
          <Account />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SettingsGallery() {
  return (
    <Gallery
      title="Settings, three ways"
      note="The same three areas in each (Sources, Notifications, Account; plans live on their own page). The kind cards are narrower in all three. A puts the areas in order down one 720px column under section titles. B is an in-page nav at the left with one area showing. C is tabs across the top."
    >
      <div className="flex flex-col gap-10">
        <Way letter="A" name="One column" from="section titles over band cards">
          <WayA />
        </Way>
        <Way letter="B" name="Side nav" from="React Bits settings-form-1">
          <WayB />
        </Way>
        <Way letter="C" name="Tabs" from="shadcn/ui tabs.tsx">
          <WayC />
        </Way>
      </div>
    </Gallery>
  );
}
