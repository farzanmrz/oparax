"use client";
import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { Command, FileText, Filter } from "lucide-react";
const SIZE = 240;
const doc = { x: 56, y: 44, w: 128, h: 160, r: 8 };
const lines = [
  { y: 66, w: 78 },
  { y: 80, w: 96 },
  { y: 94, w: 60, hit: true },
  { y: 108, w: 100 },
  { y: 122, w: 84 },
  { y: 136, w: 92, hit: true },
  { y: 150, w: 70 },
  { y: 164, w: 98 },
  { y: 178, w: 54, hit: true },
];
const hits = lines.filter((l) => l.hit);
const sources = ["Documents", "Conversations", "Shared files"];
const queries = ["invoice", "refund policy", "Q3 forecast"];
const badges = [
  {
    label: "12 results",
    icon: FileText,
    className: "left-[2%] top-[14%]",
    delay: 0,
  },
  {
    label: "Filters",
    icon: Filter,
    className: "right-[2%] top-[14%]",
    delay: 1.4,
  },
];
const ease = [0.22, 1, 0.36, 1] as const;
const STEP_MS = 2200;
export default function Bento17() {
  const reduce = !!useReducedMotion();
  const [step, setStep] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (reduce || pinned !== null) return;
    const id = window.setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce, pinned]);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [10, -10]), {
    stiffness: 160,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-12, 12]), {
    stiffness: 160,
    damping: 18,
  });
  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || locked) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const release = () => {
    setLocked(false);
    px.set(0);
    py.set(0);
    setPinned(null);
  };
  const hitIndex = pinned ?? step % hits.length;
  const target = hits[hitIndex];
  const query = queries[Math.floor(step / hits.length) % queries.length];
  const lens = { x: doc.x + 22 + target.w / 2, y: target.y };
  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="@container relative min-h-[220px] flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_70%)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]"
        />

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease }}
          onPointerMove={track}
          onPointerLeave={release}
          className="absolute inset-0 flex items-center justify-center p-4 [perspective:900px]"
        >
          <motion.div
            style={{ rotateX, rotateY, width: SIZE, height: SIZE }}
            className="relative shrink-0 scale-[0.85] [transform-style:preserve-3d] @sm:scale-100 @2xl:scale-[1.12]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-[14px] rounded-full border border-dashed border-neutral-300 motion-safe:animate-[spin_60s_linear_infinite] dark:border-neutral-700"
            />
            <div
              aria-hidden="true"
              className="absolute inset-[34px] rounded-full bg-neutral-900/[0.04] blur-2xl dark:bg-white/[0.06]"
            />

            <svg
              aria-hidden="true"
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <rect
                x={doc.x}
                y={doc.y}
                width={doc.w}
                height={doc.h}
                rx={doc.r}
                strokeWidth={1.25}
                className="fill-white stroke-neutral-300 dark:fill-neutral-950 dark:stroke-neutral-700"
              />
              <rect
                x={doc.x + 14}
                y={doc.y + 12}
                width={40}
                height={5}
                rx={2.5}
                className="fill-neutral-900 dark:fill-white"
              />
              {lines.map((line) => {
                const lit = line.hit && hits.indexOf(line) === hitIndex;
                return (
                  <g
                    key={line.y}
                    onMouseEnter={
                      line.hit ? () => setPinned(hits.indexOf(line)) : undefined
                    }
                    onPointerEnter={
                      line.hit ? () => setLocked(true) : undefined
                    }
                    onPointerLeave={
                      line.hit ? () => setLocked(false) : undefined
                    }
                  >
                    {line.hit && (
                      <motion.rect
                        x={doc.x + 10}
                        y={line.y - 6}
                        width={line.w + 8}
                        height={12}
                        rx={3}
                        initial={false}
                        animate={{ opacity: lit ? 1 : 0.35 }}
                        transition={{ duration: 0.3 }}
                        className="fill-neutral-100 dark:fill-neutral-800"
                      />
                    )}
                    <rect
                      x={doc.x + 14}
                      y={line.y - 1.5}
                      width={line.w}
                      height={3}
                      rx={1.5}
                      className={
                        lit
                          ? "fill-neutral-900 dark:fill-white"
                          : line.hit
                            ? "fill-neutral-400 dark:fill-neutral-500"
                            : "fill-neutral-200 dark:fill-neutral-800"
                      }
                    />
                    {line.hit && (
                      <rect
                        x={doc.x + 10}
                        y={line.y - 7}
                        width={line.w + 8}
                        height={14}
                        fill="transparent"
                      />
                    )}
                  </g>
                );
              })}

              <motion.g
                className="pointer-events-none"
                initial={false}
                animate={{ x: lens.x, y: lens.y }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 120, damping: 16 }
                }
              >
                <line
                  x1={18}
                  y1={18}
                  x2={34}
                  y2={34}
                  stroke="currentColor"
                  strokeWidth={7}
                  strokeLinecap="round"
                  className="text-neutral-900 dark:text-white"
                />
                <circle
                  r={24}
                  className="fill-white/70 stroke-neutral-900 dark:fill-neutral-950/70 dark:stroke-white"
                  strokeWidth={4}
                />
                <circle
                  r={24}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-white/60 dark:text-neutral-900/60"
                />
              </motion.g>
            </svg>

            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <motion.span
                  key={badge.label}
                  animate={reduce ? undefined : { y: [0, -5, 0] }}
                  transition={{
                    duration: 4.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: badge.delay,
                  }}
                  style={{ translateZ: 22 }}
                  className={`absolute inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-sm will-change-transform dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 ${badge.className}`}
                >
                  <Icon className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
                  {badge.label}
                </motion.span>
              );
            })}

            <motion.span
              key={query}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease }}
              style={{ translateZ: 30 }}
              className="absolute -bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)] dark:bg-white dark:text-neutral-900 dark:shadow-none"
            >
              <Command className="h-3 w-3" />
              {query}
              <span className="text-neutral-400 dark:text-neutral-500">
                0.03s
              </span>
            </motion.span>
          </motion.div>
        </motion.div>
        <div className="absolute left-6 top-1/2 hidden w-[148px] -translate-y-1/2 @2xl:block">
          <p className="text-[11px] font-medium text-neutral-500">
            Your workspace, indexed
          </p>
          <div className="mt-3 space-y-3">
            {sources.map((source) => (
              <div
                key={source}
                className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300"
              >
                <FileText className="h-3.5 w-3.5 text-neutral-400" />
                {source}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute right-6 top-1/2 hidden w-[148px] -translate-y-1/2 @2xl:block">
          <p className="mb-2 text-[11px] font-medium text-neutral-500">
            Top matches
          </p>
          {queries.map((result, index) => (
            <button
              key={result}
              type="button"
              onPointerEnter={() => setPinned(index)}
              onPointerLeave={() => setPinned(null)}
              onFocus={() => setPinned(index)}
              onBlur={() => setPinned(null)}
              onClick={() => {
                setStep(index * hits.length);
                setPinned(index);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left text-[11px] transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:bg-neutral-800"
            >
              <span className="text-[10px] tabular-nums text-neutral-400">
                0{index + 1}
              </span>
              <span className="font-medium capitalize text-neutral-700 dark:text-neutral-300">
                {result}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
          Find anything, instantly
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Search across documents, messages and files in one box, with results
          ranked by what you actually open.
        </p>
      </div>
    </article>
  );
}
