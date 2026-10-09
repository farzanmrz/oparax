"use client";

// The source aside (the Deck's SourceList, design preview v2/deck/feed.tsx): "Sources", then each kind under its
// small capitalized label with Newsroom's kind icon, one line per source (the logo, the name, the handle or host, and
// the count column when the page has counts), three per kind and then Show more. On the feed a row filters the feed
// to that source and All sources clears it; a selected row stays in view when its kind is folded.

import { Layers } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GroupGlyph, SourceMark } from "@/components/one/marks";
import { monitorContent } from "@/lib/monitor/content";
import type { AsideGroup, AsideKind } from "@/lib/monitor/present";
import { cn } from "@/lib/utils";

const copy = monitorContent.aside;
/** Rows per kind before Show more. */
export const SHOWN = 3;

export const markKind = (kind: AsideKind) =>
  kind === "x" ? "x" : kind === "github" ? "github" : "site";

/** The aside's title in the Deck's type. */
export function AsideTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2 px-1.5 pt-1 pb-2">
      <p className="text-[13px] font-semibold text-t1">{children}</p>
      {action}
    </div>
  );
}

/** A kind's small capitalized label with its icon; the kind's own control, if any, at the right. */
export function GroupLabel({
  kind,
  children,
  action,
}: {
  kind: AsideKind;
  children: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-7 items-center gap-1.5 px-2 pb-1">
      <GroupGlyph kind={kind} className="size-3 text-t3" />
      <h2 className="font-mono text-[10.5px] tracking-[0.12em] text-t3 uppercase">{children}</h2>
      {action ? <div className="ml-auto flex items-center">{action}</div> : null}
    </div>
  );
}

/** Which rows show: the first three, plus any row that must stay in view (selected, or carrying an error). */
export function useShowMore() {
  const [more, setMore] = useState<Set<string>>(() => new Set());
  const toggle = (kind: string) =>
    setMore((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  return { isOpen: (kind: string) => more.has(kind), toggle };
}

export function visibleRows<T>(rows: T[], open: boolean, pinned: (row: T) => boolean) {
  if (open || rows.length <= SHOWN) return rows;
  const first = rows.slice(0, SHOWN);
  return [...rows.filter((row) => pinned(row) && !first.includes(row)), ...first];
}

export function ShowMore({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className="mt-0.5 ml-[36px] rounded-sm text-[12px] text-t3 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring"
    >
      {open ? copy.less : copy.more}
    </button>
  );
}

const row =
  "flex min-h-8 w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring";
const rowOn =
  "bg-[var(--brand-soft)] shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]";

/** The name and, when it differs, the handle or host, on one line. */
export function RowName({ name, address }: { name: string; address: string }) {
  return (
    <span className="min-w-0 flex-1 truncate text-[13px]">
      <span className="text-t1">{name}</span>
      {address !== name ? <span className="ml-1.5 text-[11.5px] text-t3">{address}</span> : null}
    </span>
  );
}

/** The feed's source aside. Every row is a link that filters the feed. */
export function SourceList({
  groups,
  all,
}: {
  groups: AsideGroup[];
  all: { href: string; on: boolean };
}) {
  const { isOpen, toggle } = useShowMore();
  return (
    <nav aria-label={copy.title} className="p-2.5">
      <AsideTitle>{copy.title}</AsideTitle>
      <Link
        href={all.href}
        aria-current={all.on ? "page" : undefined}
        scroll={false}
        className={cn(row, all.on && rowOn)}
      >
        <span className="grid size-[18px] shrink-0 place-items-center rounded-[5px] bg-[var(--brand-soft)] text-[var(--brand)]">
          <Layers className="size-3" aria-hidden="true" />
        </span>
        <span className="flex-1 text-[13px] text-t1">{copy.all}</span>
      </Link>
      {groups.map((group) => {
        const open = isOpen(group.kind);
        return (
          <section key={group.kind} className="mt-3.5">
            <GroupLabel kind={group.kind}>{group.label}</GroupLabel>
            <ul>
              {visibleRows(group.rows, open, (r) => r.on).map((source) => (
                <li key={source.key}>
                  <Link
                    href={source.href}
                    aria-current={source.on ? "page" : undefined}
                    scroll={false}
                    className={cn(row, source.on && rowOn)}
                  >
                    <SourceMark kind={markKind(group.kind)} mark={source.mark} size={18} />
                    <RowName name={source.name} address={source.address} />
                    {source.count !== null ? (
                      <span className="shrink-0 text-[11px] text-t3 tabular-nums">
                        {source.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            {group.rows.length > SHOWN ? (
              <ShowMore open={open} onClick={() => toggle(group.kind)} />
            ) : null}
          </section>
        );
      })}
      {groups.length ? null : <p className="px-2 pt-1 text-[12.5px] text-t3">{copy.empty}</p>}
    </nav>
  );
}
