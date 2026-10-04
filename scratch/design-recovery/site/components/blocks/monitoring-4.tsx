"use client";

import { useMemo, useState } from "react";
import { BellOff, Check, ChevronRight, Search } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out";

const frame =
  "rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950";
const panel =
  "rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900";

const bars = (seed: number) =>
  Array.from(
    { length: 24 },
    (_, i) =>
      0.35 +
      0.32 * Math.sin(i * 0.55 + seed) +
      0.22 * Math.sin(i * 0.19 + seed * 2.3),
  );

type State = "firing" | "pending" | "resolved" | "silenced";

type Alert = {
  id: string;
  rule: string;
  service: string;
  severity: "Critical" | "Warning" | "Info";
  condition: string;
  observed: string;
  duration: string;
  state: State;
  seed: number;
  runbook: string;
};

const ALERTS: Alert[] = [
  {
    id: "a1",
    rule: "Checkout p99 above budget",
    service: "payments-edge",
    severity: "Critical",
    condition: "p99 latency > 8s for 5m",
    observed: "11.4s",
    duration: "38m",
    state: "firing",
    seed: 1.2,
    runbook:
      "Drain the failing region, then raise the charge worker pool to 240.",
  },
  {
    id: "a2",
    rule: "Error rate spike",
    service: "api-gateway",
    severity: "Critical",
    condition: "5xx rate > 2% for 3m",
    observed: "4.1%",
    duration: "12m",
    state: "firing",
    seed: 3.4,
    runbook:
      "Check the last deploy, roll back if the spike matches the release marker.",
  },
  {
    id: "a3",
    rule: "Queue depth climbing",
    service: "invoice-worker",
    severity: "Warning",
    condition: "depth > 5,000 for 10m",
    observed: "7,318",
    duration: "1h 04m",
    state: "firing",
    seed: 5.6,
    runbook:
      "Scale consumers to 12 and confirm the vendor webhook is responding.",
  },
  {
    id: "a4",
    rule: "Disk usage nearing limit",
    service: "search-api",
    severity: "Warning",
    condition: "disk > 85% for 15m",
    observed: "88%",
    duration: "22m",
    state: "pending",
    seed: 7.8,
    runbook: "Rotate the index snapshots older than 14 days.",
  },
  {
    id: "a5",
    rule: "Certificate expiring",
    service: "edge-proxy",
    severity: "Info",
    condition: "expiry < 14d",
    observed: "9 days",
    duration: "2d",
    state: "pending",
    seed: 9.1,
    runbook: "Renewal is automated; confirm the ACME job ran on Sunday.",
  },
  {
    id: "a6",
    rule: "Cache hit ratio dropped",
    service: "catalog-api",
    severity: "Warning",
    condition: "hit ratio < 90% for 10m",
    observed: "94%",
    duration: "resolved 14:02",
    state: "resolved",
    seed: 11.3,
    runbook: "Warm the catalog cache after a bulk import.",
  },
  {
    id: "a7",
    rule: "Replication lag",
    service: "orders-db",
    severity: "Critical",
    condition: "lag > 30s for 5m",
    observed: "4s",
    duration: "resolved 11:47",
    state: "resolved",
    seed: 13.7,
    runbook: "Lag clears on its own once the nightly vacuum finishes.",
  },
];

const TABS: { id: State | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "firing", label: "Firing" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
];

const SEVERITY_DOT: Record<Alert["severity"], string> = {
  Critical: "bg-red-500",
  Warning: "bg-amber-500",
  Info: "bg-neutral-300 dark:bg-neutral-600",
};

function Sparkbars({ seed, alarming }: { seed: number; alarming: boolean }) {
  const values = useMemo(() => bars(seed), [seed]);
  return (
    <span aria-hidden className="flex h-6 items-end gap-[2px]">
      {values.map((v, i) => (
        <span
          key={i}
          style={{ height: `${Math.max(12, Math.min(100, v * 100))}%` }}
          className={cx(
            "w-[3px] rounded-[1px]",
            alarming && i > values.length - 7
              ? "bg-red-400"
              : "bg-neutral-200 dark:bg-neutral-700",
          )}
        />
      ))}
    </span>
  );
}

export default function Monitoring4() {
  const [tab, setTab] = useState<State | "all">("firing");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>("a1");
  const [states, setStates] = useState<Record<string, State>>(
    Object.fromEntries(ALERTS.map((a) => [a.id, a.state])),
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALERTS.filter((a) => {
      const state = states[a.id];
      if (tab !== "all" && state !== tab) return false;
      if (!q) return true;
      return (
        a.rule.toLowerCase().includes(q) || a.service.toLowerCase().includes(q)
      );
    });
  }, [tab, query, states]);

  const count = (id: State | "all") =>
    id === "all"
      ? ALERTS.length
      : ALERTS.filter((a) => states[a.id] === id).length;

  return (
    <div className="flex h-full min-h-[720px] w-full flex-col overflow-hidden bg-white p-4 sm:p-6 dark:bg-neutral-950">
      <div
        className={cx(
          frame,
          "mx-auto flex min-h-0 w-full max-w-[1000px] flex-1 flex-col gap-1",
        )}
      >
        <div className={cx(panel, "px-4 py-3.5")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
                Alerts
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-neutral-500 tabular-nums">
                {count("firing")} firing · {count("pending")} pending ·
                evaluated every 30s
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setStates((s) => {
                  const next = { ...s };
                  ALERTS.forEach((a) => {
                    if (next[a.id] === "firing") next[a.id] = "silenced";
                  });
                  return next;
                })
              }
              className={cx(
                "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-2.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800",
                transition,
                focus,
              )}
            >
              <BellOff className="h-3.5 w-3.5" aria-hidden />
              Silence firing
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Alert state"
              className="flex items-center gap-0.5 rounded-[var(--rb-r-lg,10px)] bg-neutral-100 p-1 dark:bg-neutral-800/60"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={t.id === tab}
                  onClick={() => setTab(t.id)}
                  className={cx(
                    "inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-sm,6px)] px-2.5 text-[12px] font-medium",
                    transition,
                    focus,
                    t.id === tab
                      ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-neutral-900 dark:text-neutral-100"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
                  )}
                >
                  {t.label}
                  <span className="text-neutral-400 tabular-nums">
                    {count(t.id)}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative min-w-0 flex-1 sm:max-w-[260px]">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <label htmlFor="monitoring-4-search" className="sr-only">
                Search alerts
              </label>
              <input
                id="monitoring-4-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rule or service"
                className={cx(
                  "h-8 w-full rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white pr-2.5 pl-8 text-[13px] text-neutral-900 placeholder:text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100",
                  transition,
                  focus,
                )}
              />
            </div>
          </div>
        </div>

        <div className={cx(panel, "min-h-0 flex-1 overflow-y-auto p-2")}>
          {list.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <Check className="h-6 w-6 text-neutral-300 dark:text-neutral-700" />
              <p className="mt-3 text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                Nothing to look at
              </p>
              <p className="mt-1 max-w-[300px] text-[12px] text-neutral-500">
                No alerts match this view. Quiet is the expected state.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {list.map((a) => {
                const state = states[a.id];
                const isOpen = expanded === a.id;
                const alarming = state === "firing";
                return (
                  <li
                    key={a.id}
                    className="rounded-[var(--rb-r-md,8px)] bg-neutral-50 dark:bg-neutral-800/40"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : a.id)}
                      className={cx(
                        "flex w-full cursor-pointer items-center gap-3 rounded-[var(--rb-r-md,8px)] px-3 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/70",
                        transition,
                        focus,
                      )}
                    >
                      <ChevronRight
                        aria-hidden
                        className={cx(
                          "h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-150 ease-out motion-reduce:transition-none",
                          isOpen && "rotate-90",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                            {a.rule}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500">
                            <span
                              aria-hidden
                              className={cx(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                SEVERITY_DOT[a.severity],
                              )}
                            />
                            {a.severity}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-neutral-500 tabular-nums">
                          {a.service} · {a.condition}
                        </span>
                      </span>
                      <span className="hidden shrink-0 sm:block">
                        <Sparkbars seed={a.seed} alarming={alarming} />
                      </span>
                      <span className="w-[76px] shrink-0 text-right">
                        <span
                          className={cx(
                            "block text-[13px] font-medium tabular-nums",
                            alarming
                              ? "text-red-600 dark:text-red-400"
                              : "text-neutral-800 dark:text-neutral-200",
                          )}
                        >
                          {a.observed}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-neutral-400 tabular-nums">
                          {state === "silenced" ? "silenced" : a.duration}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 pl-[38px]">
                        <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                          {a.runbook}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setStates((s) => ({ ...s, [a.id]: "resolved" }))
                            }
                            className={cx(
                              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-2.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800",
                              transition,
                              focus,
                            )}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden />
                            Mark resolved
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStates((s) => ({
                                ...s,
                                [a.id]:
                                  s[a.id] === "silenced" ? a.state : "silenced",
                              }))
                            }
                            className={cx(
                              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-md,8px)] px-2.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                              transition,
                              focus,
                            )}
                          >
                            <BellOff className="h-3.5 w-3.5" aria-hidden />
                            {state === "silenced" ? "Unsilence" : "Silence 2h"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className={cx(
            panel,
            "flex flex-wrap items-center justify-between gap-2 px-3 py-2",
          )}
        >
          <p className="text-[12px] text-neutral-500 tabular-nums">
            Showing {list.length} of {ALERTS.length} rules
          </p>
          <button
            type="button"
            onClick={() =>
              setStates(
                Object.fromEntries(
                  ALERTS.map((a) => [a.id, a.state]),
                ) as Record<string, State>,
              )
            }
            className={cx(
              "inline-flex h-8 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] px-2.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              transition,
              focus,
            )}
          >
            Reset states
          </button>
        </div>
      </div>
    </div>
  );
}
