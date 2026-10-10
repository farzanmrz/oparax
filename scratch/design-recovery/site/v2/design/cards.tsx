"use client";

import { Plus, X as CloseIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { lift, liftStyle } from "@/v2/deck/chrome";
import { groups, HANDLE, sources } from "@/v2/deck/data";
import { GroupGlyph, SourceMark, XAvatar } from "@/v2/deck/marks";
import { XLogo } from "@/pro/shared/brand";
import { profile } from "@/next/data/onboarding";
import { hue } from "@/v2/one/shell";
import { Gallery, Way } from "./shared";

// Three card systems, each drawn on the same three contents (a sources kind, the account, Twitter DMs) so the
// owner compares the system, not the content. A: the One's band card (Deck's lift with a raised header band).
// B: shadcn/ui's Card as shipped (CardHeader with title, description and action; CardContent), on our tokens.
// C: React Bits settings-form-1's section: the title and a line at the left, the content at the right.

const twitter = sources.filter((s) => s.group === "x").slice(0, 4);
const kind = groups[0];

function AddSource() {
  return (
    <button
      type="button"
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-[var(--window)] px-2.5 text-[12.5px] font-medium text-t2 transition-colors hover:bg-raised hover:text-t1"
      style={{ boxShadow: "var(--top-light)" }}
    >
      <Plus className="size-3.5" aria-hidden="true" />
      Add source
    </button>
  );
}

function Rows({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-x-4", className)}>
      {twitter.map((s) => (
        <li key={s.id} className="group/row flex min-h-9 items-center gap-3 rounded-md px-2 hover:bg-raised">
          <SourceMark source={s} size={20} />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-[13.5px] font-medium text-t1">{s.name}</span>
            <span className="ml-2 text-[12.5px] text-t3">{s.handle}</span>
          </span>
          <span className="grid size-7 place-items-center text-t3 opacity-0 group-hover/row:opacity-100">
            <CloseIcon className="size-3.5" aria-hidden="true" />
          </span>
        </li>
      ))}
    </ul>
  );
}

const Message = () => (
  <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground">
    <XLogo className="size-3.5" />
    Message @oparax_ai
  </button>
);
const dmText = 'Opens a message to @oparax_ai with "Start alerts" typed. Send it from @farzanmrz to connect alerts; that message is how Oparax confirms the account is yours.';

/* A: the band card */
function BandCard({ head, action, children }: { head: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={cn(lift, "overflow-hidden")} style={liftStyle}>
      <div className="flex h-11 items-center gap-2.5 bg-[var(--raised)] px-4">
        {head}
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function WayA() {
  return (
    <div className="grid gap-5">
      <BandCard
        head={
          <>
            <GroupGlyph group={kind.id} className={cn("size-4", hue[kind.id])} />
            <h2 className="text-[16px] font-semibold text-t1">{kind.label}</h2>
          </>
        }
        action={<AddSource />}
      >
        <Rows />
      </BandCard>
      <BandCard
        head={
          <>
            <XAvatar handle={HANDLE} size={24} />
            <h2 className="text-[16px] font-semibold text-t1">{profile.name}</h2>
            <span className="text-[13px] text-t3">{profile.handle}</span>
          </>
        }
        action={<span className="text-[13px] text-t2 underline decoration-line-strong underline-offset-4">Plans</span>}
      >
        <p className="px-2 text-[13px] text-t2">farzan@newsroom.com</p>
        <p className="mt-2 px-2 text-[13px] text-t2">Free week. Plans from $5 a month.</p>
      </BandCard>
      <BandCard
        head={
          <>
            <XLogo className="size-4 text-t1" />
            <h2 className="text-[16px] font-semibold text-t1">Twitter DMs</h2>
          </>
        }
        action={<span className="text-[13px] text-t3">Not connected</span>}
      >
        <div className="px-2">
          <Message />
          <p className="mt-3 text-[13px] leading-[1.5] text-t2">{dmText}</p>
        </div>
      </BandCard>
    </div>
  );
}

/* B: shadcn/ui Card as shipped */
function WayB() {
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <GroupGlyph group={kind.id} className={cn("size-4", hue[kind.id])} />
            {kind.label}
          </CardTitle>
          <CardDescription>Accounts your agent watches on Twitter.</CardDescription>
          <CardAction>
            <AddSource />
          </CardAction>
        </CardHeader>
        <CardContent>
          <Rows />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <XAvatar handle={HANDLE} size={24} />
            {profile.name}
          </CardTitle>
          <CardDescription>{profile.handle}</CardDescription>
          <CardAction>
            <span className="text-[13px] text-t2 underline decoration-line-strong underline-offset-4">Plans</span>
          </CardAction>
        </CardHeader>
        <CardContent className="text-[13px] text-t2">
          <p>farzan@newsroom.com</p>
          <p className="mt-2">Free week. Plans from $5 a month.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <XLogo className="size-4 text-t1" />
            Twitter DMs
          </CardTitle>
          <CardDescription>Not connected</CardDescription>
        </CardHeader>
        <CardContent>
          <Message />
          <p className="mt-3 text-[13px] leading-[1.5] text-t2">{dmText}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* C: React Bits settings-form-1's section: label left, content right */
function SideCard({ title, line, glyph, action, children }: { title: string; line: string; glyph: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={cn(lift, "grid grid-cols-[180px_minmax(0,1fr)] overflow-hidden")} style={liftStyle}>
      <div className="flex flex-col gap-1.5 border-r border-line bg-[var(--well)] p-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-t1">
          {glyph}
          {title}
        </p>
        <p className="text-[12px] leading-[1.45] text-t3">{line}</p>
        {action ? <div className="mt-auto pt-3">{action}</div> : null}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function WayC() {
  return (
    <div className="grid gap-5">
      <SideCard title={kind.label} line="Accounts your agent watches on Twitter." glyph={<GroupGlyph group={kind.id} className={cn("size-4", hue[kind.id])} />} action={<AddSource />}>
        <Rows />
      </SideCard>
      <SideCard title={profile.name} line={profile.handle} glyph={<XAvatar handle={HANDLE} size={20} />} action={<span className="text-[13px] text-t2 underline decoration-line-strong underline-offset-4">Plans</span>}>
        <p className="px-2 text-[13px] text-t2">farzan@newsroom.com</p>
        <p className="mt-2 px-2 text-[13px] text-t2">Free week. Plans from $5 a month.</p>
      </SideCard>
      <SideCard title="Twitter DMs" line="Not connected" glyph={<XLogo className="size-4 text-t1" />}>
        <div className="px-2">
          <Message />
          <p className="mt-3 text-[13px] leading-[1.5] text-t2">{dmText}</p>
        </div>
      </SideCard>
    </div>
  );
}

export function CardsGallery() {
  return (
    <Gallery
      title="One card, three ways"
      note="The same three contents in each column: a sources kind, the account, Twitter DMs. A is the band card from Settings direction A. B is shadcn/ui's Card as shipped, on our colours. C is React Bits Pro's settings section, the title at the left of the content."
    >
      <Way letter="A" name="Band card" from="the One, Settings A">
        <WayA />
      </Way>
      <Way letter="B" name="shadcn Card" from="shadcn/ui card.tsx">
        <WayB />
      </Way>
      <Way letter="C" name="Side label" from="React Bits settings-form-1">
        <WayC />
      </Way>
    </Gallery>
  );
}
