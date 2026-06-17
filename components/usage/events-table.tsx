"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { compactTokens, pstStamp, usd } from "@/lib/usage/format";
import type { EventView } from "@/lib/usage/types";

const ALL = "__all__";

interface EventsTableProps {
  events: EventView[];
  /** Initial facet seed pushed from the shell (e.g. from a breakdown click). */
  facet?: {
    kind?: string;
    provider?: string;
  };
}

const columns: ColumnDef<EventView>[] = [
  {
    accessorKey: "createdAt",
    header: "Time (PST)",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {pstStamp(getValue<string>())}
      </span>
    ),
  },
  {
    accessorKey: "kind",
    header: "Kind",
    filterFn: "equalsString",
    cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
  },
  {
    accessorKey: "provider",
    header: "Provider",
    filterFn: "equalsString",
  },
  {
    accessorKey: "model",
    header: "Model",
    cell: ({ getValue }) => getValue<string | null>() ?? "—",
  },
  {
    id: "tokens",
    header: "Tokens (in / out)",
    cell: ({ row }) => {
      const e = row.original;
      return (
        <span className="tabular-nums text-muted-foreground">
          {compactTokens(e.inputTokens ?? 0)} / {compactTokens(e.outputTokens ?? 0)}
        </span>
      );
    },
  },
  {
    accessorKey: "cost",
    header: "Cost",
    cell: ({ getValue }) => (
      <span className="font-medium tabular-nums">{usd(getValue<number>())}</span>
    ),
  },
];

/**
 * Global filter: substring match across kind, model, provider, and (short) user
 * id. TanStack invokes global filters as (row, columnId, filterValue, addMeta) —
 * the search string is the THIRD arg, not the second.
 */
function globalFilterFn(
  row: {
    original: EventView;
  },
  _columnId: string,
  filterValue: string,
): boolean {
  const q = String(filterValue).trim().toLowerCase();
  if (!q) return true;
  const e = row.original;
  return [e.kind, e.model ?? "", e.provider, e.userId ?? ""].some((f) =>
    f.toLowerCase().includes(q),
  );
}

/**
 * Faceted, sortable, searchable table over leaf usage events. Time sorts desc by
 * default; the toolbar offers a global search (model / provider / user) plus kind
 * and provider Select facets. The shell may seed those facets via `facet`.
 */
export function EventsTable({ events, facet }: EventsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "createdAt",
      desc: true,
    },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Distinct facet options from the loaded events.
  const kinds = useMemo(() => [...new Set(events.map((e) => e.kind))].sort(), [events]);
  const providers = useMemo(() => [...new Set(events.map((e) => e.provider))].sort(), [events]);

  // Seed column filters when the shell pushes a facet (e.g. breakdown click).
  useEffect(() => {
    const next: ColumnFiltersState = [];
    if (facet?.kind)
      next.push({
        id: "kind",
        value: facet.kind,
      });
    if (facet?.provider)
      next.push({
        id: "provider",
        value: facet.provider,
      });
    setColumnFilters(next);
  }, [facet]);

  const table = useReactTable({
    data: events,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  const kindFilter = (table.getColumn("kind")?.getFilterValue() as string) ?? ALL;
  const providerFilter = (table.getColumn("provider")?.getFilterValue() as string) ?? ALL;

  // Totals over the currently-filtered rows (reflects search, facets, and the
  // tree focus passed in via `events`). Shown as the table footer.
  const filteredRows = table.getFilteredRowModel().rows;
  const totals = filteredRows.reduce(
    (acc, row) => {
      acc.cost += row.original.cost;
      acc.inTok += row.original.inputTokens ?? 0;
      acc.outTok += row.original.outputTokens ?? 0;
      return acc;
    },
    { cost: 0, inTok: 0, outTok: 0 },
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-medium text-foreground">Events</h2>
        <Input
          placeholder="Search model / provider / user"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-56"
        />
        <Select
          value={kindFilter}
          onValueChange={(v) => table.getColumn("kind")?.setFilterValue(v === ALL ? undefined : v)}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All kinds</SelectItem>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={providerFilter}
          onValueChange={(v) =>
            table.getColumn("provider")?.setFilterValue(v === ALL ? undefined : v)
          }
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={() => header.column.toggleSorting()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="text-muted-foreground">
                            {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No events match.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
        <span className="font-medium text-foreground">Totals</span>
        <span>
          <span className="text-muted-foreground">API calls</span>{" "}
          <span className="font-medium tabular-nums">{filteredRows.length.toLocaleString()}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Cost</span>{" "}
          <span className="font-medium tabular-nums">{usd(totals.cost)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Tokens in / out</span>{" "}
          <span className="font-medium tabular-nums">
            {compactTokens(totals.inTok)} / {compactTokens(totals.outTok)}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
