"use client";

import { cn } from "@/lib/utils";
import { Stage } from "@/v2/deck/chrome";

// The local design gallery (owner, Oct 10: "trigger /design to first show it locally so that we're not wasting time
// building the page"): review-only pages under /v2/design/<name> that put two or three ways of one thing side by
// side, built from the parts we own (shadcn/ui, React Bits Pro, Deck's and the One's components). No product page
// is edited by anything here.

export function Gallery({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <Stage>
      <div className="palette-council mx-auto w-full max-w-[1400px] px-8 pt-8 pb-40">
        <h1 className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-t1">{title}</h1>
        <p className="mt-2 max-w-[760px] text-[13px] leading-[1.5] text-t3">{note}</p>
        <div className="mt-8 flex items-start gap-8">{children}</div>
      </div>
    </Stage>
  );
}

/** One way, labelled: the letter, the name, what it borrows, then the thing itself. */
export function Way({ letter, name, from, className, children }: { letter: string; name: string; from: string; className?: string; children: React.ReactNode }) {
  return (
    <section aria-label={`${letter}: ${name}`} className={cn("min-w-0 flex-1", className)}>
      <p className="flex items-baseline gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-[var(--brand)] text-[12px] font-semibold text-white">{letter}</span>
        <span className="text-[15px] font-semibold text-t1">{name}</span>
        <span className="text-[12px] text-t3">{from}</span>
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
