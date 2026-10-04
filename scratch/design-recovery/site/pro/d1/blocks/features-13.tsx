// Adapted from React Bits Pro features-13 (https://pro.reactbits.dev/docs/blocks/features). Changes: four Cadence scheduling items reduced to exactly two (Direct and Clustered); vignettes replaced by a real Direct item and a real Clustered story; neutral, white and emerald colors swapped for semantic tokens; vendor 1400px container replaced by the shared frame; heading demoted below the hero; numbered "01" labels and the in-view mount reveal removed (the section is static until the reader clicks); lg breakpoints moved to desk.
"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Layers, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { frame } from "../../shared/shell";
import { modes } from "../content";
import { DirectCard, StoryCard } from "../story";

type ModeId = (typeof modes.items)[number]["id"];
const icons = { direct: Rows3, clustered: Layers } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

function Vignette({ id }: { id: ModeId }) {
  return id === "direct" ? (
    <DirectCard item={modes.directSample} className="w-full max-w-md" />
  ) : (
    <StoryCard story={modes.clusteredSample} className="w-full max-w-md" />
  );
}

export function Features13() {
  const [activeId, setActiveId] = useState<ModeId>("direct");
  const reduce = useReducedMotion();
  const active = modes.items.find((item) => item.id === activeId) ?? modes.items[0];

  return (
    <section
      id={modes.id}
      aria-labelledby="d1-modes-title"
      className="w-full border-y border-border bg-secondary/40 py-16 desk:py-20"
    >
      <div className={frame}>
        <div className="max-w-2xl">
          <h2 id="d1-modes-title" className="text-3xl font-semibold tracking-tight text-balance desk:text-4xl">
            {modes.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground desk:text-lg">{modes.intro}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 items-start gap-10 desk:mt-12 desk:grid-cols-[1fr_1.05fr] desk:gap-14">
          <div className="divide-y divide-border border-y border-border">
            {modes.items.map((item) => {
              const isOpen = item.id === activeId;
              const Icon = icons[item.id];
              return (
                <div key={item.id}>
                  <h3>
                    <button
                      type="button"
                      id={`d1-mode-trigger-${item.id}`}
                      aria-expanded={isOpen}
                      aria-controls={`d1-mode-panel-${item.id}`}
                      onClick={() => setActiveId(item.id)}
                      className="group flex min-h-11 w-full cursor-pointer items-center gap-4 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring desk:py-6"
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg border transition-colors duration-200",
                          isOpen ? "border-primary/40 bg-accent text-primary" : "border-border bg-card text-muted-foreground",
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-lg font-semibold tracking-tight transition-colors duration-200 desk:text-xl",
                          isOpen ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        {item.title}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
                        className={isOpen ? "text-foreground" : "text-muted-foreground"}
                      >
                        <ChevronDown className="size-4" aria-hidden="true" />
                      </motion.span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        id={`d1-mode-panel-${item.id}`}
                        role="region"
                        aria-labelledby={`d1-mode-trigger-${item.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="pb-6">
                          <p className="max-w-md pr-8 pl-13 text-base leading-relaxed text-muted-foreground">{item.body}</p>
                          <div className="mt-6 flex justify-center desk:hidden">
                            <Vignette id={item.id} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="hidden min-h-[440px] flex-col items-center justify-center rounded-2xl border border-border bg-background/60 p-8 desk:flex">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                className="flex w-full flex-col items-center"
              >
                <Vignette id={active.id} />
                <p className="mt-5 text-sm text-muted-foreground">{active.caption}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
