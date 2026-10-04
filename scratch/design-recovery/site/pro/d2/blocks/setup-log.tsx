"use client";

// Adapted from React Bits Pro agent-activity-2 (https://pro.reactbits.dev/docs/app-ui/agent-activity). Changes:
// the billing ETL PHASES became the product's three real onboarding steps and report messages (see ../content);
// removed every duration, the total time, the duration bars and the bar scale; completed phases show a check
// instead of a neutral dot; only phases with real messages are disclosures; the 560px minimum height became
// natural height inside the section; surfaces use the shared semantic tokens; stock disclosure motion kept.
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronRight } from "lucide-react";
import { setup } from "../content";
import { cx, focusInset } from "./scroll-fade";

export default function SetupLog() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState<Record<number, boolean>>({ 2: true });
  const { log } = setup;

  return (
    <figure className="rb-theme-scope flex w-full flex-col gap-3 rounded-[var(--rb-r-4xl)] border border-border bg-card p-4 text-card-foreground shadow-[0_1px_2px_rgb(9_15_29/0.06),0_20px_50px_-28px_rgb(9_15_29/0.35)] desk:p-5">
      <header className="flex shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-[-0.01em] text-foreground">{log.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[var(--rb-accent)]" />
            {log.status}
          </p>
        </div>
      </header>

      <div className="rounded-[var(--rb-r-2xl)] border border-border bg-muted/60 p-1">
        <div className="rounded-[var(--rb-r-lg)] border border-border bg-card p-1">
          <ol className="flex flex-col">
            {log.phases.map((phase, i) => {
              const isOpen = Boolean(open[i]);
              const expandable = phase.messages.length > 0;
              const row = (
                <>
                  <span
                    aria-hidden="true"
                    className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--rb-accent)] text-[var(--rb-accent-fg)]"
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-medium text-foreground">{phase.label}</span>
                  {expandable && (
                    <ChevronRight
                      aria-hidden="true"
                      className={cx(
                        "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
                        isOpen && "rotate-90",
                      )}
                    />
                  )}
                </>
              );
              return (
                <li key={phase.label} className="overflow-hidden">
                  {expandable ? (
                    <button
                      type="button"
                      onClick={() => setOpen((prev) => ({ ...prev, [i]: !prev[i] }))}
                      aria-expanded={isOpen}
                      className={cx(
                        "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[var(--rb-r-sm)] px-2.5 text-left transition-[transform,background-color] duration-150 ease-out hover:bg-muted active:scale-[0.99]",
                        focusInset,
                      )}
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="flex min-h-11 items-center gap-3 px-2.5">{row}</div>
                  )}

                  <AnimatePresence initial={false}>
                    {expandable && isOpen && (
                      <motion.div
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <ul className="relative ml-[19px] border-l border-border pb-2 pl-6 pr-2">
                          {phase.messages.map((message) => (
                            <li key={message} className="flex min-h-9 items-center text-[13px] text-muted-foreground">
                              {message}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <figcaption className="px-1 text-xs leading-relaxed text-muted-foreground">{log.caption}</figcaption>
    </figure>
  );
}
