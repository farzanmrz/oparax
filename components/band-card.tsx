import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BandCard({
  icon,
  title,
  headerAside,
  variant = "default",
  className,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  headerAside?: ReactNode;
  variant?: "default" | "danger";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-slot="band-card"
      data-variant={variant}
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] shadow-[var(--card-shadow)]",
        variant === "danger" && "border-destructive/55",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-center gap-2.5 border-b border-[var(--band-border)] bg-[var(--band-bg)] px-6 py-3 text-[length:var(--fs-band-header)] font-medium text-band-header-text",
          variant === "danger" && "bg-destructive/8 text-danger-text",
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-[22px] shrink-0 items-center justify-center rounded-md border border-white/14 bg-white/6 [&_svg]:size-3.5"
        >
          {icon}
        </span>
        <span>{title}</span>
        {headerAside ? <span className="ml-auto shrink-0">{headerAside}</span> : null}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
