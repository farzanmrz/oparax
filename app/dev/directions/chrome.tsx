"use client";

// app/dev/directions/chrome.tsx — the session-built shared fixture chrome (single source).
// Every board state renders as a FULL PAGE inside PageFrame: visible viewport bounds with a
// dimensions chip, faithful fixture renders of the shared chrome (site header; the mobile
// desk-tab bar this slice builds), and the outside-frame annotation slot. Lanes import and
// wrap — they never rebuild chrome, so the owner compares pages, not chromes.
//
// The chrome here is a faithful STAND-IN (the real SiteHeader needs live route/session
// state); classes mirror components/site-header.tsx and the slice's planned mobile tab bar.

import { ChevronsUpDownIcon, PauseIcon, Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { OparaxMark } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Viewport = "mobile" | "web";
type Chrome = "desk" | "deskless";
type HeaderVariant = "existing" | "v1";

const TABS = ["Feed", "Voice", "Setup"] as const;

function TabPills({ stretch = false }: { readonly stretch?: boolean }) {
  return (
    <nav aria-label="Agent sections" className="flex items-center gap-1">
      {TABS.map((tab) => (
        <span
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-3 font-medium text-sm",
            stretch && "h-10 flex-1 justify-center",
            tab === "Feed" ? "bg-white/10 text-foreground" : "text-muted-foreground",
          )}
          key={tab}
        >
          {tab}
        </span>
      ))}
    </nav>
  );
}

function HeaderFixture({
  viewport,
  chrome,
  variant,
}: {
  viewport: Viewport;
  chrome: Chrome;
  variant: HeaderVariant;
}) {
  const desk = chrome === "desk";
  const compactV1 = variant === "v1" && viewport === "mobile";
  const pickerContent = (
    <>
      {desk ? (
        <>
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-success" />
          <span className="truncate font-medium">Arsenal watch</span>
        </>
      ) : (
        <span className="truncate font-medium">Your agents</span>
      )}
      <ChevronsUpDownIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
    </>
  );
  return (
    <div className="sticky top-0 z-10 shrink-0 bg-card">
      <header
        className={cn(
          "relative flex h-14 shrink-0 items-center justify-between border-border border-b px-4 sm:px-6",
          compactV1 ? "gap-2" : "gap-3",
        )}
      >
        <div className={cn("flex min-w-0 items-center", compactV1 ? "gap-1.5" : "gap-3")}>
          <span className="flex items-center gap-2">
            <OparaxMark className="size-5 text-foreground" />
            {compactV1 ? null : (
              <span className="font-bold text-[19px] tracking-tight">Oparax</span>
            )}
          </span>
          {compactV1 ? null : <Separator className="h-4" orientation="vertical" />}
          {compactV1 ? (
            <button
              aria-haspopup="listbox"
              className="flex h-8 min-w-0 max-w-36 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-sm"
              type="button"
            >
              {pickerContent}
            </button>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-sm">{pickerContent}</span>
          )}
          {desk ? (
            <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
              <span className="flex size-7 items-center justify-center rounded-md">
                <PauseIcon aria-hidden className="size-4 text-warning" />
              </span>
              <span className="flex size-7 items-center justify-center rounded-md">
                <Trash2Icon aria-hidden className="size-4 text-destructive" />
              </span>
            </span>
          ) : null}
        </div>

        {desk && viewport === "web" ? (
          <div className="-translate-x-1/2 absolute left-1/2 hidden md:block">
            <TabPills />
          </div>
        ) : null}

        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-medium text-xs">
          R
        </span>
      </header>
      {desk && viewport === "mobile" ? (
        <div className="border-border border-b px-2 py-1">
          <TabPills stretch />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One framed FULL PAGE per board state. `note` is the lane's annotation — rendered OUTSIDE
 * the frame in an obviously-not-page-UI style (amber mono). Children are the page content
 * exactly as it would render inside app/agents/layout.tsx's container, below the header.
 */
export function PageFrame({
  viewport,
  chrome,
  headerVariant = "existing",
  note,
  children,
}: {
  readonly viewport: Viewport;
  readonly chrome: Chrome;
  readonly headerVariant?: HeaderVariant;
  readonly note: string;
  readonly children: ReactNode;
}) {
  const mobile = viewport === "mobile";
  return (
    <section className="flex flex-col items-center gap-2">
      <div
        className={cn("flex w-full items-start gap-2", mobile ? "max-w-[375px]" : "max-w-[1280px]")}
      >
        <span aria-hidden className="mt-0.5 h-4 w-1 shrink-0 rounded bg-amber-500/80" />
        <p className="flex-1 font-mono text-amber-200/90 text-xs">{note}</p>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
          {mobile ? "375 × 812" : "1280 × 800"}
        </span>
      </div>
      <div
        className={cn(
          "flex flex-col overflow-y-auto border-2 border-border/80 bg-background",
          mobile
            ? "h-[812px] w-[375px] rounded-[1.5rem]"
            : "h-[800px] w-full max-w-[1280px] rounded-xl",
        )}
      >
        <HeaderFixture chrome={chrome} variant={headerVariant} viewport={viewport} />
        <div className="mx-auto flex w-full max-w-[102rem] flex-1 flex-col px-4 sm:px-6">
          {children}
        </div>
      </div>
    </section>
  );
}
