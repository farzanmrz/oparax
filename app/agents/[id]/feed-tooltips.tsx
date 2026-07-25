"use client";

// The Feed's two tooltip-bearing controls, extracted into a client boundary. `feed-item.tsx`
// is a Server Component, and a Radix Tooltip whose `asChild` trigger child crosses the RSC
// boundary hydrates differently than it server-renders (React 19.2 + Next 16.2) — a
// reproducible hydration error on every Feed load. The whole tooltip subtree therefore lives
// here, client-side, and the server component passes only plain data (a count), never element
// children, matching every other tooltip site in the app (all client components).
import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/** The disabled "View source on X" scaffold. No `x_post_id`/URL in the pinned FeedStory
 *  shape, so there is nowhere real for this to link to yet — a disabled scaffold rather than
 *  a placeholder `href="#"`, which the design's own mock uses but which fails
 *  `useValidAnchor`. The span wrapper (not the disabled button) is the tooltip's trigger: a
 *  natively disabled element fires no pointer/focus events, so anchoring to it would keep the
 *  tooltip from ever showing. */
export function ViewSourceButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              aria-disabled="true"
              aria-label="View source on X"
              disabled
              size="icon-sm"
              variant="ghost"
            >
              <ExternalLinkIcon aria-hidden="true" className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>View source on X</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
