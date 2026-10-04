"use client";

import { Globe, Mail, MessageSquareText, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { Segments } from "@/next/council/marks";
import { freeWeek, reaches, reads, tiers, type ReachNode } from "./data";

// Where Oparax reads and reaches you, as two logo panels (Supabase's logo grid, Vercel's bordered panels): what
// works today keeps its own colors on a lit cell, what comes next sits in grey. No "planned" labels; the color
// says it. Then the plans as four objects in the feed's tile language: a pool meter in the X-post blue and an
// alert-cadence strip per tier.

function Logo({ node }: { node: ReachNode }) {
  const style = node.live ? undefined : { filter: "var(--planned-filter)" };
  if (node.glyph === "web" || node.glyph === "rss") {
    const Icon = node.glyph === "web" ? Globe : Rss;
    return (
      <span className="grid size-8 place-items-center rounded-lg bg-[var(--kind-article-soft)] text-[var(--kind-article)]" style={style}>
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
    );
  }
  if (!node.logo) {
    const Icon = node.name === "Email" ? Mail : MessageSquareText;
    return (
      <span className="grid size-8 place-items-center rounded-lg bg-raised text-t3" style={style}>
        <Icon className="size-[18px]" />
      </span>
    );
  }
  return (
    <span className="grid size-8 place-items-center" style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={node.logo} alt="" className={cn("size-8 rounded-lg object-contain", node.logoDark && "dark:hidden")} />
      {node.logoDark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.logoDark} alt="" className="hidden size-7 object-contain dark:block" />
      ) : null}
    </span>
  );
}

function Panel({ title, nodes, cols, className }: { title: React.ReactNode; nodes: ReachNode[]; cols: number; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-[14px] border border-line-strong bg-[var(--window)]", className)} style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
      <header className="flex h-11 items-center gap-2 border-b border-line px-5 text-[13px] font-medium text-t1">{title}</header>
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {nodes.map((n, i) => (
          <li
            key={n.name}
            className={cn(
              "flex h-[104px] flex-col items-center justify-center gap-2.5 border-line-soft text-[12.5px]",
              (i + 1) % cols !== 0 && "border-r",
              i < nodes.length - cols && "border-b",
              n.live ? "bg-[var(--raised)] font-medium text-t1" : "text-t4",
            )}
            style={n.live ? { boxShadow: "var(--top-light)" } : undefined}
          >
            <Logo node={n} />
            {n.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Reach() {
  return (
    <div className="grid grid-cols-[1fr_0.62fr] gap-5">
      <Panel title="Reads" nodes={reads} cols={5} />
      <Panel
title="Reaches you"
        nodes={reaches}
        cols={3}
      />
    </div>
  );
}

/* ─────────────── Plans ─────────────── */

const maxPool = Math.max(...tiers.map((t) => t.pool));

/** A 24-hour strip: one tick for a daily DM, 96 quarter-hour slots for Wire. */
function Cadence({ kind }: { kind: "daily" | "quarter" }) {
  const slots = kind === "daily" ? 1 : 96;
  return (
    <div aria-hidden="true" className="relative h-6 rounded-md border border-line bg-[var(--well)]">
      {kind === "daily" ? (
        <span className="absolute top-1 bottom-1 left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-t2" />
      ) : (
        <span className="absolute inset-1 flex gap-px">
          {Array.from({ length: slots }, (_, i) => (
            <span key={i} className="flex-1 rounded-[1px] bg-t3/45" />
          ))}
        </span>
      )}
    </div>
  );
}

function PlanTile({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col rounded-[14px] border border-line-strong bg-[var(--window)] p-5", className)} style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
      {children}
    </section>
  );
}

const label = "text-[11.5px] font-medium text-t4";

export function Plans() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <PlanTile className="bg-[var(--rail)]">
        <p className="text-[15px] font-semibold text-t1">Free week</p>
        <p className="mt-2 text-[30px] leading-none font-semibold tracking-[-0.02em] text-t1">
          $0 <span className="text-[13px] font-normal tracking-normal text-t3">for 7 days</span>
        </p>
        <div className="mt-6">
          <p className={label}>Days</p>
          <div className="mt-2">
            <Segments total={freeWeek.days} filled={freeWeek.days} tone="caution" />
          </div>
        </div>
        <div className="mt-5">
          <p className={label}>Watched X posts</p>
          <p className="mt-1.5 text-[13px] tabular-nums text-t1">{freeWeek.pool}</p>
        </div>
        <p className="mt-auto pt-5 text-[12.5px] leading-snug text-t3">No card. It starts when your agent is ready.</p>
      </PlanTile>
      {tiers.map((t) => (
        <PlanTile key={t.name}>
          <p className="text-[15px] font-semibold text-t1">{t.name}</p>
          <p className="mt-2 text-[30px] leading-none font-semibold tracking-[-0.02em] text-t1">
            ${t.price} <span className="text-[13px] font-normal tracking-normal text-t3">a month</span>
          </p>
          <div className="mt-6">
            <p className={cn(label, "flex items-center gap-1.5")}>
              <XLogo className="size-2.5 text-[var(--kind-post)]" /> Watched X posts a month
            </p>
            <p className="mt-1.5 text-[13px] tabular-nums text-t1">{t.pool.toLocaleString("en-US")}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-strong">
              <div className="h-full rounded-full bg-[var(--kind-post)]" style={{ width: `${Math.max(3, (t.pool / maxPool) * 100)}%` }} />
            </div>
          </div>
          <div className="mt-5">
            <p className={label}>Alerts in your X DMs</p>
            <p className="mt-1.5 text-[13px] text-t1">{t.alert}</p>
            <div className="mt-2">
              <Cadence kind={t.cadence} />
            </div>
          </div>
        </PlanTile>
      ))}
    </div>
  );
}
