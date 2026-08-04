"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeedFilterState } from "@/lib/agent/feed-query";

function dateValue(iso: string | null) { return iso ? new Date(iso).toLocaleDateString("en-CA") : ""; }
function localStart(day: string) { return day ? new Date(`${day}T00:00:00`).toISOString() : null; }
function localEnd(day: string) { if (!day) return null; const date = new Date(`${day}T00:00:00`); date.setDate(date.getDate() + 1); return date.toISOString(); }

export function FeedFilters({ trackedHandles, filters }: { trackedHandles: string[]; filters: FeedFilterState }) {
  const pathname = usePathname(); const router = useRouter();
  const [query, setQuery] = useState(filters.q ?? "");
  const [from, setFrom] = useState(dateValue(filters.from)); const [to, setTo] = useState(dateValue(filters.to));
  const update = (next: Partial<FeedFilterState>) => {
    const value = { ...filters, ...next }; const params = new URLSearchParams();
    if (value.status !== "all") params.set("status", value.status);
    if (value.account) params.set("account", value.account);
    if (value.from) params.set("from", value.from);
    if (value.to) params.set("to", value.to);
    if (value.q) params.set("q", value.q);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  };
  useEffect(() => { const timer = setTimeout(() => update({ q: query.trim().length >= 2 ? query.trim() : null }), 400); return () => clearTimeout(timer); }, [query]);
  return <div className="sticky top-0 z-10 flex min-h-11 items-center gap-2 overflow-x-auto bg-background py-1">
    <Tabs onValueChange={(status) => update({ status: status as FeedFilterState["status"] })} value={filters.status}>
      <TabsList><TabsTrigger className="min-h-11" value="all">All</TabsTrigger><TabsTrigger className="min-h-11" value="pending">Pending</TabsTrigger><TabsTrigger className="min-h-11" value="posted">Posted</TabsTrigger></TabsList>
    </Tabs>
    <Select onValueChange={(account) => update({ account: account === "all" ? null : account })} value={filters.account ?? "all"}>
      <SelectTrigger className="min-h-11"><SelectValue placeholder="All sources" /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem>{trackedHandles.map((handle) => <SelectItem key={handle} value={handle}>@{handle}</SelectItem>)}</SelectContent>
    </Select>
    <Popover><PopoverTrigger asChild><Button className="min-h-11" variant="ghost">{from || to ? `${from || "…"} – ${to || "…"}` : "Dates"}</Button></PopoverTrigger><PopoverContent>
      <Input aria-label="From date" onChange={(e) => { setFrom(e.target.value); update({ from: localStart(e.target.value) }); }} type="date" value={from} />
      <Input aria-label="To date" onChange={(e) => { setTo(e.target.value); update({ to: localEnd(e.target.value) }); }} type="date" value={to} />
      <Button className="min-h-11" onClick={() => { setFrom(""); setTo(""); update({ from: null, to: null }); }} variant="ghost">Clear</Button>
    </PopoverContent></Popover>
    <Input className="min-h-11 min-w-44" onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }} placeholder="Search" value={query} />
  </div>;
}
