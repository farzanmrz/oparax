// The ONE page-heading treatment for redesigned /agents/* content. Copy uses Title Case and the
// optional actions slot stays right-aligned on the same row.
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
      <h1 className="text-[21px] font-bold tracking-[-0.015em] text-text-page-header">
        {children}
      </h1>
      {actions ?? null}
    </div>
  );
}
