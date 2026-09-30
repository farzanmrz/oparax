import { brandMarks } from "@/lib/brands/marks";
import { cn } from "@/lib/utils";

export function BrandIcon({
  name,
  className,
  mono = false,
}: {
  name: keyof typeof brandMarks;
  className?: string;
  mono?: boolean;
}) {
  const mark = brandMarks[name];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4", className)}>
      <path
        d={mark.path}
        fill={mono || name === "x" || name === "github" ? "currentColor" : mark.color}
      />
    </svg>
  );
}
