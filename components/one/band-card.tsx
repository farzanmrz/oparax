import { lift } from "@/components/one/stage";
import { cn } from "@/lib/utils";

// The one card (owner, Oct 10: "the band card looks fine", one card everywhere; lab v2/one/card-band.tsx): the lift
// with a 44px band on the raised ground holding a mark, a Title Case title and one action or status at the right;
// the body under it on the card ground, content only. No hairline under the band. Sources' kinds, the account, the
// Twitter DMs and the onboarding's right column all use it.

export function BandCard({
  glyph,
  heading,
  action,
  children,
  className,
  bodyClassName,
  label,
}: {
  glyph?: React.ReactNode;
  heading: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** The section's accessible name when the heading is not plain text. */
  label?: string;
}) {
  return (
    <section aria-label={label} className={cn(lift, "overflow-hidden", className)}>
      <div className="flex h-11 shrink-0 items-center gap-2.5 bg-[var(--raised)] px-4">
        {glyph}
        <h2 className="min-w-0 flex-1 truncate text-[15px] leading-5 font-semibold text-t1">
          {heading}
        </h2>
        {action ? <span className="ml-auto flex shrink-0 items-center gap-2">{action}</span> : null}
      </div>
      <div className={cn("px-4 py-3", bodyClassName)}>{children}</div>
    </section>
  );
}

/** The small bordered button that sits in a band or a row (Add, Change, Watch). */
export const bandButton =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line-strong bg-[var(--window)] px-2.5 text-[12.5px] font-medium text-t2 shadow-[var(--top-light)] transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";
