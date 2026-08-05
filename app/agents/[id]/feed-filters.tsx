"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeedFilterState } from "@/lib/agent/feed-query";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function dateValue(iso: string | null) {
  return iso ? formatLocalDate(new Date(iso)) : "";
}
function dateValueTo(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  date.setDate(date.getDate() - 1);
  return formatLocalDate(date);
}
function localStart(day: string) {
  return day ? new Date(`${day}T00:00:00`).toISOString() : null;
}
function localEnd(day: string) {
  if (!day) return null;
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

export function FeedFilters({
  trackedHandles,
  filters,
}: {
  trackedHandles: string[];
  filters: FeedFilterState;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(filters.q ?? "");
  const [from, setFrom] = useState(dateValue(filters.from));
  const [to, setTo] = useState(dateValueTo(filters.to));
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const update = (next: Partial<FeedFilterState>) => {
    const value = { ...filtersRef.current, ...next };
    const params = new URLSearchParams();
    if (value.status !== "all") params.set("status", value.status);
    if (value.account) params.set("account", value.account);
    if (value.from) params.set("from", value.from);
    if (value.to) params.set("to", value.to);
    if (value.q) params.set("q", value.q);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: debounce keyed on query alone; update reads the live filtersRef.
  useEffect(() => {
    const trimmed = query.trim();
    const nextQ = trimmed.length >= 2 ? trimmed : null;
    if (nextQ === filtersRef.current.q) return;
    const timer = setTimeout(() => update({ q: nextQ }), 400);
    return () => clearTimeout(timer);
  }, [query]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: resyncs fire only when the APPLIED URL value changes; local input state is compared, not depended on.
  useEffect(() => {
    const trimmed = query.trim();
    const localQ = trimmed.length >= 2 ? trimmed : null;
    if (filters.q !== localQ) setQuery(filters.q ?? "");
  }, [filters.q]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: resyncs fire only when the APPLIED URL value changes; local input state is compared, not depended on.
  useEffect(() => {
    if (filters.from !== localStart(from)) setFrom(dateValue(filters.from));
  }, [filters.from]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: resyncs fire only when the APPLIED URL value changes; local input state is compared, not depended on.
  useEffect(() => {
    if (filters.to !== localEnd(to)) setTo(dateValueTo(filters.to));
  }, [filters.to]);
  return (
    <div className="sticky top-0 z-10 flex min-h-11 items-center gap-2 overflow-x-auto bg-background py-1">
      <Tabs
        onValueChange={(status) => update({ status: status as FeedFilterState["status"] })}
        value={filters.status}
      >
        <TabsList className="min-h-11">
          <TabsTrigger className="min-h-11" value="all">
            All
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="pending">
            Pending
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="posted">
            Posted
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Select
        onValueChange={(account) => update({ account: account === "__all__" ? null : account })}
        value={filters.account ?? "__all__"}
      >
        <SelectTrigger className="min-h-11">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All sources</SelectItem>
          {trackedHandles.map((handle) => (
            <SelectItem key={handle} value={handle}>
              @{handle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button className="min-h-11" variant="ghost">
            {from || to ? `${from || "…"} – ${to || "…"}` : "Dates"}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Input
            aria-label="From date"
            className="min-h-11"
            onChange={(e) => {
              setFrom(e.target.value);
              update({ from: localStart(e.target.value) });
            }}
            type="date"
            value={from}
          />
          <Input
            aria-label="To date"
            className="min-h-11"
            onChange={(e) => {
              setTo(e.target.value);
              update({ to: localEnd(e.target.value) });
            }}
            type="date"
            value={to}
          />
          <Button
            className="min-h-11"
            onClick={() => {
              setFrom("");
              setTo("");
              update({ from: null, to: null });
            }}
            variant="ghost"
          >
            Clear
          </Button>
        </PopoverContent>
      </Popover>
      <Input
        aria-label="Search stories"
        className="min-h-11 min-w-44"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
        }}
        placeholder="Search"
        value={query}
      />
    </div>
  );
}
