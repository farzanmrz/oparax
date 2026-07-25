"use client";

// The Feed's two tooltip-bearing controls, extracted into a client boundary. `feed-item.tsx`
// is a Server Component, and a Radix Tooltip whose `asChild` trigger child crosses the RSC
// boundary hydrates differently than it server-renders (React 19.2 + Next 16.2) — a
// reproducible hydration error on every Feed load. The whole tooltip subtree therefore lives
// here, client-side, and the server component passes only plain data (a count), never element
// children, matching every other tooltip site in the app (all client components).
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** The "+N" clustered-sources badge with its explanatory tooltip. */
export function ExtraSourcesBadge({ count }: { count: number }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="shrink-0 font-mono" variant="secondary">
            +{count}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {count} more source{count === 1 ? "" : "s"} clustered into this story
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
