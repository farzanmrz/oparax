// The ONE page/section heading treatment for /agents/* content — the Feed's column headers,
// Voice's "Writing guide", and any future section title share this exact line so the app stops
// growing a fourth (fifth, sixth…) ad-hoc heading style (four distinct size/weight/color combos
// were counted across Feed/Setup/Voice/Create before this existed). One row: the title, and an
// optional right-aligned actions slot (e.g. Voice's Audit button). Sentence case per AGENTS.md;
// this is a heading primitive, not a card title — shadcn's CardTitle stays what it is inside
// cards.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeading({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {actions ?? null}
    </div>
  );
}
