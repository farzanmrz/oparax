"use client";

import { ChevronDownIcon, PlusIcon } from "lucide-react";
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
import { deriveDeskLabel } from "@/lib/agent/desk-label";
import { cn } from "@/lib/utils";

export type SwitcherDesk = { id: string; beat: string; status: string };

/**
 * Site-header desk switcher: a live-status dot + the current desk's label
 * (or a generic label off a desk page), opening a dropdown that lists every
 * desk plus "+ New desk". Works with zero desks — the dropdown then shows
 * only the "+ New desk" row. Per-desk needs-review counts are intentionally
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
          className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <StatusDot active={currentDesk?.status === "active"} />
          <span className="max-w-40 truncate font-medium">
            {currentDesk ? deriveDeskLabel(currentDesk.beat) : "Desks"}
          </span>
          <ChevronDownIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Your desk agents</DropdownMenuLabel>
        {desks.map((desk) => (
          <DropdownMenuItem asChild key={desk.id}>
            <Link href={`/agents/${desk.id}`}>
              <StatusDot active={desk.status === "active"} />
              <span className="truncate">{deriveDeskLabel(desk.beat)}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        {desks.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem asChild>
          <Link href="/agents/new">
            <PlusIcon />
            New desk
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
        active ? "animate-pulse bg-success" : "bg-muted-foreground/50",
      )}
    />
  );
}
