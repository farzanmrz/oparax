import { monitorContent } from "@/lib/monitor/content";
import { cn } from "@/lib/utils";

// The One page ground (preview v2/deck/chrome.tsx Stage and lift): the quiet page with soft light from the top,
// and the lifted surface recipe every One screen sets its cards on.

/** A lifted surface: the window ground, a strong hairline, the card shadow and the top light. */
export const lift =
  "rounded-xl border border-line-strong bg-[var(--window)] shadow-[var(--card-shadow),var(--top-light)]";
/** The one main surface of a page, lifted further. */
export const liftHigh =
  "rounded-xl border border-line-strong bg-[var(--window)] shadow-[var(--window-shadow),var(--top-light)]";
/** The blue primary action. */
export const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2.5 rounded-lg bg-primary px-4 text-[14px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70";

/** The lead card on onboarding: the setup form at rest, the run once it starts. */
export const runCard = cn(lift, "mx-auto w-full max-w-[760px]");

/** The onboarding aside: the seven steps, in the same lifted object as the source aside. */
export const stepsAside = (body: React.ReactNode) => ({
  name: "steps",
  label: monitorContent.onboarding.phasesLabel,
  body,
});

export function Stage({
  children,
  className,
  light = 560,
}: {
  children: React.ReactNode;
  className?: string;
  /** Height of the light from the top, in pixels. */
  light?: number;
}) {
  return (
    <div className={cn("relative flex min-h-dvh flex-col bg-[var(--page)] text-t1", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 bg-[image:var(--stage-light)]"
        style={{ height: light }}
      />
      {children}
    </div>
  );
}
