"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlarmClock,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSearch,
  FileText,
  Images,
  Mail,
  Menu,
  Music,
  PanelRight,
  PencilLine,
  Pin,
  Plus,
  Share2,
  Trophy,
  Users,
  X,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setEdges({
      start: scrollTop > 1,
      end: Math.ceil(scrollTop + clientHeight) < scrollHeight - 1,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    const view = el?.ownerDocument.defaultView;
    if (!el || !view?.ResizeObserver) return;
    const observer = new view.ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  return { ref, edges, onScroll: update };
}

function useScrollFadeX<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setEdges({
      start: scrollLeft > 1,
      end: Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    const view = el?.ownerDocument.defaultView;
    if (!el || !view?.ResizeObserver) return;
    const observer = new view.ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  return { ref, edges, onScroll: update };
}

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const focusInset =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const tint = "transition-colors duration-150 ease-out";

const press =
  "transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";

const iconButton =
  "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100";

const navGroups = [
  {
    label: "Editorial",
    items: [
      { label: "Story queue", icon: FileText, count: "16", current: true },
      { label: "Assignments", icon: ClipboardList, count: "6" },
      { label: "Copy desk", icon: PencilLine, count: "4" },
      { label: "Media library", icon: Images },
    ],
  },
  {
    label: "Desks",
    items: [
      { label: "Metro", icon: Building2 },
      { label: "Business", icon: Briefcase },
      { label: "Culture", icon: Music },
      { label: "Sport", icon: Trophy },
      { label: "Investigations", icon: FileSearch },
    ],
  },
  {
    label: "Distribution",
    items: [
      { label: "Newsletters", icon: Mail },
      { label: "Syndication", icon: Share2 },
      { label: "Audience", icon: Users },
    ],
  },
  {
    label: "Saved views",
    items: [
      { label: "My desk", icon: Pin },
      { label: "Late stories", icon: AlarmClock, count: "2" },
    ],
  },
];

type Status = "Scheduled" | "In review" | "Needs edits" | "Drafting";

type Story = {
  title: string;
  owner: string;
  status: Status;
  publishOn: string | null;
};

const stories: Story[] = [
  {
    title: "Harbor tunnel overruns reach $40m",
    owner: "Priya Raghunathan",
    status: "Needs edits",
    publishOn: "2026-08-12",
  },
  {
    title: "Council delays the vacancy tax vote",
    owner: "Tomasz Nowak",
    status: "In review",
    publishOn: "2026-08-12",
  },
  {
    title: "The grid contract and winter rates",
    owner: "Ari Chen",
    status: "Scheduled",
    publishOn: "2026-08-13",
  },
  {
    title:
      "Inside the ferry terminal rebuild: three years, two contractors and a berth that still does not fit",
    owner: "Lena Ortiz",
    status: "Drafting",
    publishOn: null,
  },
  {
    title: "Eastside schools reopen Monday",
    owner: "Devon Okafor",
    status: "Scheduled",
    publishOn: "2026-08-13",
  },
  {
    title: "The quiet return of the night bus",
    owner: "Sofia Martins",
    status: "In review",
    publishOn: "2026-08-14",
  },
  {
    title: "Port authority names its next chief",
    owner: "Marcus Lund",
    status: "Scheduled",
    publishOn: "2026-08-14",
  },
  {
    title: "A year on the hearing aid waitlist",
    owner: "Priya Raghunathan",
    status: "Drafting",
    publishOn: "2026-08-17",
  },
  {
    title: "Riverfront market loses half its stalls",
    owner: "Jun Park",
    status: "In review",
    publishOn: "2026-08-17",
  },
  {
    title: "The landlord of Fenwick Street",
    owner: "Ari Chen",
    status: "Needs edits",
    publishOn: "2026-08-19",
  },
  {
    title: "Fare evasion fines fall again",
    owner: "Tomasz Nowak",
    status: "Scheduled",
    publishOn: "2026-08-19",
  },
  {
    title: "One helicopter, a 40-minute gap",
    owner: "Marguerite Oyelaran-Bishop",
    status: "Drafting",
    publishOn: "2026-08-21",
  },
  {
    title: "Where the city compost actually goes",
    owner: "Sofia Martins",
    status: "In review",
    publishOn: "2026-08-21",
  },
  {
    title: "The last dry dock on the north bank",
    owner: "Marcus Lund",
    status: "Scheduled",
    publishOn: "2026-08-24",
  },
  {
    title: "Rent arrears cases double",
    owner: "Jun Park",
    status: "Drafting",
    publishOn: null,
  },
  {
    title: "A cycle lane that ends in a hedge",
    owner: "Devon Okafor",
    status: "Scheduled",
    publishOn: "2026-08-27",
  },
];

const filters = ["All stories", "In review", "Needs edits"] as const;
type Filter = (typeof filters)[number];

type ScheduleItem = {
  iso: string;
  time: string;
  title: string;
  slot: string;
};

const schedule: ScheduleItem[] = [
  {
    iso: "2026-08-12",
    time: "4:00 PM",
    title: "Evening briefing send",
    slot: "Newsletter",
  },
  {
    iso: "2026-08-13",
    time: "6:00 AM",
    title: "The grid contract and winter rates",
    slot: "Homepage lead",
  },
  {
    iso: "2026-08-13",
    time: "12:00 PM",
    title: "Eastside schools reopen Monday",
    slot: "Local",
  },
  {
    iso: "2026-08-14",
    time: "6:00 AM",
    title: "Port authority names its next chief",
    slot: "Homepage lead",
  },
  {
    iso: "2026-08-17",
    time: "5:00 PM",
    title: "Print pages lock",
    slot: "Sunday edition",
  },
  {
    iso: "2026-08-19",
    time: "6:00 AM",
    title: "Fare evasion fines fall again",
    slot: "Homepage lead",
  },
  {
    iso: "2026-08-21",
    time: "9:00 AM",
    title: "Weekly desk planning",
    slot: "All desks",
  },
  {
    iso: "2026-08-24",
    time: "6:00 AM",
    title: "The last dry dock on the north bank",
    slot: "Homepage lead",
  },
  {
    iso: "2026-08-27",
    time: "6:00 AM",
    title: "A cycle lane that ends in a hedge",
    slot: "Local",
  },
];

const scheduledDays = new Set(schedule.map((item) => item.iso));

const today = "2026-08-12";

const dayInitials = ["S", "M", "T", "W", "T", "F", "S"];
const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type DayCell = { iso: string; day: number; inMonth: boolean };

function buildMonth(year: number, month: number): DayCell[] {
  const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(year, month, 1 + i - lead));
    return {
      iso: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    };
  });
}

const monthLabel = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const fullDayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

function StatusCell({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-neutral-600 dark:text-neutral-400">
      <span
        aria-hidden="true"
        className={cx(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          status === "Needs edits"
            ? "bg-amber-500"
            : "bg-neutral-300 dark:bg-neutral-600",
        )}
      />
      {status}
    </span>
  );
}

function PublishDate({ iso }: { iso: string | null }) {
  if (!iso) {
    return <span className="text-neutral-400 dark:text-neutral-600">, </span>;
  }
  return <>{dayLabel(iso)}</>;
}

function SidebarBody({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2.5 pl-4 pr-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[13px] font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]">
          N
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
            Northline
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
            City desk
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className={cx(iconButton, tint, focus)}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <nav aria-label="Primary" className="min-h-0 flex-1 space-y-4 px-2 pb-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <a
                      href="#story-queue"
                      aria-current={item.current ? "page" : undefined}
                      className={cx(
                        "flex h-8 cursor-pointer items-center gap-2 rounded-[var(--rb-r-md,8px)] px-3 text-[13px] active:bg-neutral-200 dark:active:bg-neutral-700",
                        item.current
                          ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                        tint,
                        focus,
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-500"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      {item.count && (
                        <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-500">
                          {item.count}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 p-2">
        <div className="flex items-center gap-2.5 rounded-[var(--rb-r-lg,10px)] bg-neutral-100 px-2.5 py-2 dark:bg-neutral-800">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
            MO
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
              Marguerite Oyelaran-Bishop
            </p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
              Managing editor
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function SchedulePanel({ onClose }: { onClose: () => void }) {
  const upNext = useScrollFade<HTMLDivElement>();
  const [view, setView] = useState({ year: 2026, month: 7 });
  const [selected, setSelected] = useState(today);
  const cells = useMemo(() => buildMonth(view.year, view.month), [view]);
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      buildMonth(2026, 7).findIndex((cell) => cell.iso === today),
    ),
  );
  const dayRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const upcoming = schedule.filter((item) => item.iso >= selected);

  const goToMonth = (delta: number) => {
    const next = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    setActive(next.getUTCDay());
  };

  const moveTo = (index: number) => {
    const clamped = Math.min(41, Math.max(0, index));
    setActive(clamped);
    dayRefs.current[clamped]?.focus({ preventScroll: true });
  };

  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const targets: Record<string, number> = {
      ArrowLeft: i - 1,
      ArrowRight: i + 1,
      ArrowUp: i - 7,
      ArrowDown: i + 7,
      Home: i - (i % 7),
      End: i - (i % 7) + 6,
    };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    moveTo(next);
  };

  const weeks = Array.from({ length: 6 }, (_, row) =>
    cells.slice(row * 7, row * 7 + 7),
  );

  return (
    <div className="flex h-full w-full min-w-0 flex-col lg:w-72 xl:w-96">
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <h2 className="min-w-0 flex-1 truncate text-base font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
          Schedule
        </h2>
        <button
          type="button"
          aria-label="Hide schedule"
          onClick={onClose}
          className={cx(iconButton, tint, press, focus)}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="hidden shrink-0 px-4 pb-4 lg:block">
        <div className="mb-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
            {monthLabel(view.year, view.month)}
          </p>
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => goToMonth(-1)}
            className={cx(iconButton, tint, press, focus)}
          >
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => goToMonth(1)}
            className={cx(iconButton, tint, press, focus)}
          >
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>

        <table className="w-full border-collapse">
          <caption className="sr-only">
            {monthLabel(view.year, view.month)} publishing schedule
          </caption>
          <thead>
            <tr>
              {dayInitials.map((initial, i) => (
                <th
                  key={dayNames[i]}
                  scope="col"
                  className="pb-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-500"
                >
                  <span aria-hidden="true">{initial}</span>
                  <span className="sr-only">{dayNames[i]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, row) => (
              <tr key={week[0].iso}>
                {week.map((cell, column) => {
                  const index = row * 7 + column;
                  const isToday = cell.iso === today;
                  const isSelected = cell.iso === selected;
                  return (
                    <td key={cell.iso} className="p-0 text-center">
                      <button
                        ref={(node) => {
                          dayRefs.current[index] = node;
                        }}
                        type="button"
                        tabIndex={index === active ? 0 : -1}
                        aria-label={fullDayLabel(cell.iso)}
                        aria-pressed={isSelected}
                        aria-current={isToday ? "date" : undefined}
                        onClick={() => {
                          setSelected(cell.iso);
                          setActive(index);
                        }}
                        onKeyDown={(event) => onDayKeyDown(event, index)}
                        className={cx(
                          "relative mx-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] text-[13px] tabular-nums",
                          isToday
                            ? "bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
                            : isSelected
                              ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                              : cell.inMonth
                                ? "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                : "text-neutral-400 hover:bg-neutral-100 dark:text-neutral-600 dark:hover:bg-neutral-800",
                          tint,
                          focusInset,
                        )}
                      >
                        {scheduledDays.has(cell.iso) && (
                          <span
                            aria-hidden="true"
                            className={cx(
                              "absolute left-1/2 top-1.5 h-1 w-1 -translate-x-1/2 rounded-full",
                              isToday
                                ? "bg-white/70 dark:bg-neutral-900/60"
                                : "bg-neutral-400 dark:bg-neutral-500",
                            )}
                          />
                        )}
                        {cell.day}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="shrink-0 px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
        Up next
      </p>

      <div className="relative min-h-0 flex-1">
        <div
          ref={upNext.ref}
          onScroll={upNext.onScroll}
          className="h-full overflow-y-auto px-4 pb-4"
        >
          {upcoming.length === 0 ? (
            <div className="px-1 py-8 text-center">
              <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                Nothing scheduled
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                The calendar is clear after {dayLabel(selected)}.
              </p>
              <button
                type="button"
                onClick={() => setSelected(today)}
                className={cx(
                  "mt-4 inline-flex h-8 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] bg-neutral-100 px-2.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
                  tint,
                  press,
                  focus,
                )}
              >
                Show today
              </button>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {upcoming.map((item) => (
                <li key={`${item.iso}-${item.title}`}>
                  <button
                    type="button"
                    className={cx(
                      "relative w-full cursor-pointer rounded-[var(--rb-r-md,8px)] py-2 pl-4 pr-2 text-left hover:bg-white active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
                      tint,
                      focusInset,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute bottom-2 left-1.5 top-2 w-0.5 rounded-full bg-neutral-300 dark:bg-neutral-700"
                    />
                    <span className="block text-xs tabular-nums text-neutral-500 dark:text-neutral-500">
                      {dayLabel(item.iso)}, {item.time}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-600 dark:text-neutral-400">
                      {item.slot}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-neutral-50 to-transparent transition-opacity duration-200 ease-out dark:from-neutral-900",
            upNext.edges.start ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-50 to-transparent transition-opacity duration-200 ease-out dark:from-neutral-900",
            upNext.edges.end ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </div>
  );
}

export default function AppShell4() {
  const [filter, setFilter] = useState<Filter>("All stories");
  const [panelOpen, setPanelOpen] = useState(false);
  const [layout, setLayout] = useState<"stack" | "lg" | "xl">("stack");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerShown, setDrawerShown] = useState(false);
  const shouldFocusRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const tabs = useScrollFadeX<HTMLDivElement>();
  const content = useScrollFade<HTMLElement>();

  useEffect(() => {
    const view = triggerRef.current?.ownerDocument.defaultView ?? window;
    const xl = view.matchMedia("(min-width: 1280px)");
    const lg = view.matchMedia("(min-width: 1024px)");
    const read = () => (xl.matches ? "xl" : lg.matches ? "lg" : "stack");
    const onChange = () => setLayout(read());
    const frame = requestAnimationFrame(() => {
      const next = read();
      setLayout(next);
      setPanelOpen(next !== "stack");
    });
    xl.addEventListener("change", onChange);
    lg.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(frame);
      xl.removeEventListener("change", onChange);
      lg.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const view = triggerRef.current?.ownerDocument.defaultView ?? window;
      if (view.matchMedia("(max-width: 1023px)").matches) setMobileOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    const frame = requestAnimationFrame(() => setDrawerShown(true));
    const doc = drawer?.ownerDocument ?? document;
    const getFocusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("disabled"));
    if (shouldFocusRef.current) {
      getFocusable()[0]?.focus({ preventScroll: true });
      shouldFocusRef.current = false;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setDrawerShown(false);
        triggerRef.current?.focus({ preventScroll: true });
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    doc.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      doc.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
    setDrawerShown(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const rows = useMemo(
    () =>
      filter === "All stories"
        ? stories
        : stories.filter((story) => story.status === filter),
    [filter],
  );

  const openWidth = layout === "xl" ? 384 : layout === "lg" ? 288 : "100%";
  const shutWidth = reduceMotion || layout === "stack" ? openWidth : 0;
  const ease = [0.32, 0.72, 0, 1] as const;

  return (
    <div className="relative flex h-full min-h-[800px] w-full overflow-hidden bg-white dark:bg-neutral-950">
      <aside className="hidden w-64 shrink-0 flex-col bg-neutral-50 lg:flex dark:bg-neutral-900">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
            <button
              ref={triggerRef}
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => {
                shouldFocusRef.current = true;
                setMobileOpen(true);
              }}
              className={cx(iconButton, "lg:hidden", tint, press, focus)}
            >
              <Menu aria-hidden="true" className="h-4 w-4" />
            </button>

            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex min-w-0 items-center gap-1.5">
                <li className="hidden shrink-0 sm:block">
                  <span className="text-[13px] text-neutral-500 dark:text-neutral-500">
                    Editorial
                  </span>
                </li>
                <li aria-hidden="true" className="hidden shrink-0 sm:block">
                  <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600" />
                </li>
                <li className="min-w-0">
                  <h1
                    id="story-queue"
                    aria-current="page"
                    className="truncate text-base font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100"
                  >
                    Story queue
                  </h1>
                </li>
              </ol>
            </nav>

            <button
              type="button"
              aria-label="Schedule panel"
              aria-pressed={panelOpen}
              aria-controls="schedule-panel"
              onClick={() => setPanelOpen((open) => !open)}
              className={cx(
                "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)]",
                panelOpen
                  ? "bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] hover:bg-[color-mix(in_oklab,var(--rb-accent,oklch(20.5%_0_0))_90%,transparent)] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))] dark:hover:bg-[color-mix(in_oklab,var(--rb-accent,oklch(100%_0_0))_90%,transparent)]"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
                tint,
                press,
                focus,
              )}
            >
              <PanelRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </header>

          <div className="flex h-12 shrink-0 items-center gap-2 px-4 sm:px-6">
            <div className="relative -mx-4 min-w-0 flex-1 sm:mx-0">
              <div
                ref={tabs.ref}
                onScroll={tabs.onScroll}
                className="flex items-center gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {filters.map((name) => {
                  const selected = filter === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setFilter(name)}
                      className={cx(
                        "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] px-2.5 text-[13px] font-medium",
                        selected
                          ? "bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
                        tint,
                        press,
                        focus,
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <div
                aria-hidden="true"
                className={cx(
                  "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
                  tabs.edges.start ? "opacity-100" : "opacity-0",
                )}
              />
              <div
                aria-hidden="true"
                className={cx(
                  "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
                  tabs.edges.end ? "opacity-100" : "opacity-0",
                )}
              />
            </div>

            <button
              type="button"
              aria-label="New story"
              className={cx(
                "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white text-[13px] font-medium text-neutral-900 hover:bg-neutral-50 sm:w-auto sm:px-2.5 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800",
                tint,
                press,
                focus,
              )}
            >
              <Plus aria-hidden="true" className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">New story</span>
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <main
              ref={content.ref}
              onScroll={content.onScroll}
              className="h-full overflow-y-auto"
            >
              <table className="hidden w-full min-w-[440px] border-collapse text-left md:table">
                <caption className="sr-only">
                  Stories waiting to be published
                </caption>
                <thead className="sticky top-0 z-20 bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    <th
                      scope="col"
                      className="h-9 px-3 pl-4 text-xs font-medium text-neutral-500 sm:pl-6"
                    >
                      Story
                    </th>
                    <th
                      scope="col"
                      className="hidden h-9 w-44 px-3 text-xs font-medium text-neutral-500 xl:table-cell"
                    >
                      Owner
                    </th>
                    <th
                      scope="col"
                      className="h-9 w-28 px-3 text-xs font-medium text-neutral-500"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="h-9 w-20 px-3 pr-4 text-right text-xs font-medium text-neutral-500 sm:pr-6"
                    >
                      Publishes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                  {rows.map((story) => (
                    <tr
                      key={story.title}
                      className={cx(
                        "h-11 hover:bg-neutral-50 dark:hover:bg-neutral-900/60",
                        tint,
                      )}
                    >
                      <td className="max-w-0 px-3 pl-4 text-[13px] text-neutral-900 sm:pl-6 dark:text-neutral-100">
                        <span className="block truncate">{story.title}</span>
                      </td>
                      <td className="hidden max-w-0 px-3 text-[13px] text-neutral-600 xl:table-cell dark:text-neutral-400">
                        <span className="block truncate">{story.owner}</span>
                      </td>
                      <td className="px-3">
                        <StatusCell status={story.status} />
                      </td>
                      <td className="px-3 pr-4 text-right text-[13px] tabular-nums text-neutral-600 sm:pr-6 dark:text-neutral-400">
                        <PublishDate iso={story.publishOn} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="space-y-2 p-4 md:hidden">
                {rows.map((story) => (
                  <li
                    key={story.title}
                    className="rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 p-4 dark:border-neutral-800"
                  >
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      {story.title}
                    </p>
                    <dl className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-xs text-neutral-500">Owner</dt>
                        <dd className="min-w-0 truncate text-[13px] text-neutral-900 dark:text-neutral-100">
                          {story.owner}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-xs text-neutral-500">Status</dt>
                        <dd className="min-w-0">
                          <StatusCell status={story.status} />
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-xs text-neutral-500">Publishes</dt>
                        <dd className="text-[13px] tabular-nums text-neutral-900 dark:text-neutral-100">
                          <PublishDate iso={story.publishOn} />
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </main>
            <div
              aria-hidden="true"
              className={cx(
                "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
                content.edges.start ? "opacity-100" : "opacity-0",
              )}
            />
            <div
              aria-hidden="true"
              className={cx(
                "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
                content.edges.end ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.aside
              key={layout}
              id="schedule-panel"
              aria-label="Schedule"
              initial={{ width: shutWidth, opacity: 0 }}
              animate={{ width: openWidth, opacity: 1 }}
              exit={{
                width: shutWidth,
                opacity: 0,
                transition: { duration: reduceMotion ? 0.15 : 0.22, ease },
              }}
              transition={{ duration: reduceMotion ? 0.15 : 0.32, ease }}
              className="max-h-[45%] w-full shrink-0 overflow-hidden bg-neutral-50 lg:max-h-none dark:bg-neutral-900"
            >
              <SchedulePanel onClose={() => setPanelOpen(false)} />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {mobileOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={closeMobile}
            tabIndex={-1}
            className={cx(
              "absolute inset-0 z-30 cursor-pointer bg-neutral-950/40 backdrop-blur-[2px] transition-opacity duration-200 ease-out dark:bg-neutral-950/60",
              drawerShown ? "opacity-100" : "opacity-0",
            )}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className={cx(
              "absolute inset-y-0 left-0 z-40 flex w-72 max-w-[85%] flex-col rounded-r-[var(--rb-r-4xl,18px)] bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-neutral-900 dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)]",
              drawerShown ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <SidebarBody onClose={closeMobile} />
          </aside>
        </div>
      )}
    </div>
  );
}
