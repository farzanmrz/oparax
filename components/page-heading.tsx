// The ONE page-heading treatment for redesigned /agents/* content. Copy uses Title Case and the
// optional actions slot stays right-aligned on the same row.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeading({
  children,
  actions,
  icon,
  className,
}: {
  children: ReactNode;
  actions?: ReactNode;
  /** Decorative only; the text heading remains the accessible page name. */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span aria-hidden="true" className="text-muted-foreground [&_svg]:size-5">
            {icon}
          </span>
        ) : null}
        <h1 className="text-[21px] font-bold tracking-[-0.015em] text-text-page-header">
          {children}
        </h1>
      </div>
      {actions ?? null}
    </div>
  );
}
