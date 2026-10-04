"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  BellRing,
  CheckCircle2,
  CreditCard,
  GitPullRequest,
  MessageSquare,
} from "lucide-react";
type Toast = {
  id: number;
  icon: LucideIcon;
  title: string;
  body: string;
  time: string;
  photo?: string;
};
const feed: Omit<Toast, "id">[] = [
  {
    icon: GitPullRequest,
    title: "PR #482 approved",
    body: "Kai approved “Edge cache warmup”",
    time: "now",
    photo: "68",
  },
  {
    icon: CreditCard,
    title: "Payment received",
    body: "Nova Labs paid invoice #1029",
    time: "now",
  },
  {
    icon: AtSign,
    title: "Maya mentioned you",
    body: "“can you take a look at the copy?”",
    time: "now",
    photo: "45",
  },
  {
    icon: CheckCircle2,
    title: "Deploy succeeded",
    body: "nova.app · production · 38s",
    time: "now",
  },
  {
    icon: MessageSquare,
    title: "New comment",
    body: "Priya on “Q3 numbers are in”",
    time: "now",
    photo: "47",
  },
];
const ease = [0.22, 1, 0.36, 1] as const;
const TICK_MS = 2600;
const MAX = 3;
export default function Bento23() {
  const reduce = !!useReducedMotion();
  const [inView, setInView] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>(() =>
    feed.slice(0, 3).map((t, i) => ({ ...t, id: i, time: `${(3 - i) * 2}m` })),
  );
  const nextToast = useRef(3);
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const expanded = hovering || pinned;
  useEffect(() => {
    if (!inView || reduce || expanded) return;
    const id = window.setInterval(() => {
      const next = feed[nextToast.current % feed.length];
      nextToast.current += 1;
      setToasts((current) =>
        [{ ...next, id: Date.now() }, ...current].slice(0, MAX),
      );
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [inView, reduce, expanded]);
  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="@container relative min-h-[220px] flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]"
        />

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          onViewportEnter={() => setInView(true)}
          transition={{ duration: 0.6, ease }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHovering(true);
          }}
          onPointerLeave={() => setHovering(false)}
          className="absolute inset-0 flex items-center justify-center px-6 py-5"
        >
          <div className="relative h-[236px] w-full max-w-[320px] @2xl:max-w-[380px]">
            <AnimatePresence initial={false}>
              {toasts.map((toast, index) => {
                const Icon = toast.icon;
                const y = expanded ? 24 + index * 60 : 64 + index * 10;
                const scale = expanded ? 1 : 1 - index * 0.04;
                const opacity = expanded ? 1 : 1 - index * 0.22;
                return (
                  <motion.div
                    key={toast.id}
                    layout
                    initial={{ opacity: 0, y: -40, scale: 0.96 }}
                    animate={{ opacity, y, scale, zIndex: MAX - index }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, ease }}
                    style={{ transformOrigin: "top center" }}
                    className="absolute inset-x-0 top-0 flex cursor-default items-start gap-2.5 rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.14)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)]"
                  >
                    {toast.photo ? (
                      <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full">
                        <img
                          src={`https://i.pravatar.cc/80?img=${toast.photo}`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[11px] font-semibold text-neutral-900 dark:text-white">
                          {toast.title}
                        </p>
                        <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
                          {toast.time}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                        {toast.body}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => {
                setPinned(!expanded);
                setHovering(false);
              }}
              aria-expanded={expanded}
              className="absolute bottom-0 left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-medium text-neutral-500 shadow-sm transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            >
              <BellRing className="h-3 w-3" />
              {expanded ? "Collapse notifications" : "Expand notifications"}
            </button>
          </div>
        </motion.div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
          Know the moment it happens
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Approvals, payments and mentions arrive in one quiet stack, grouped so
          you read three things, not thirty.
        </p>
      </div>
    </article>
  );
}
