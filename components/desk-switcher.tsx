"use client";

import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deskDisplayName } from "@/lib/agent/desk-label";
import { cn } from "@/lib/utils";

export type SwitcherDesk = { id: string; name: string | null; beat: string; status: string };

/**
 * Site-header desk switcher: a live-status dot + the current desk's label
 * (or a generic label off a desk page), opening a dropdown that lists every
 * desk plus "New agent". Works with zero desks — the dropdown then shows
 * only the "New agent" row. Per-desk needs-review counts are intentionally
 * omitted here (the digest allows this rather than an N+1 query per desk;
 * the Feed tab badge in T3 is the authoritative count).
 */
export function DeskSwitcher({ desks }: { readonly desks: SwitcherDesk[] }) {
  const pathname = usePathname();
  const currentDesk = desks.find((desk) => pathname.startsWith(`/agents/${desk.id}`));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-11 min-w-0 max-w-30 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-foreground text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring desk:h-8 desk:max-w-none desk:gap-2 desk:border-transparent desk:bg-transparent"
          type="button"
        >
          <StatusDot active={currentDesk?.status === "active"} />
          <span className="max-w-32 truncate font-medium desk:max-w-40">
            {currentDesk ? deskDisplayName(currentDesk) : "Agents"}
          </span>
          <ChevronsUpDownIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Your agents</DropdownMenuLabel>
        {desks.map((desk) => (
          <DropdownMenuItem asChild key={desk.id}>
            <Link href={`/agents/${desk.id}`}>
              <StatusDot active={desk.status === "active"} />
              <span className="truncate">{deskDisplayName(desk)}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        {desks.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem asChild>
          <Link href="/agents/new">
            <PlusIcon />
            New agent
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusDot({ active }: { readonly active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        active ? "animate-[op-pulse_2s_ease-in-out_infinite] bg-success" : "bg-warning",
      )}
    />
  );
}
