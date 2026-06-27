"use client";

// Vendored from the Vercel AI Elements registry (ai-elements/suggestion). Adapted to the
// app's existing Button and without the scroll-area dependency (a plain horizontally-
// scrolling row instead of ScrollArea), so installing it doesn't overwrite the shared
// Button or pull extra deps. Same API: <Suggestions> wraps <Suggestion suggestion onClick>.

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SuggestionsProps = ComponentProps<"div">;

export function Suggestions({ className, children, ...props }: SuggestionsProps) {
  // Wrap onto multiple rows rather than horizontal-scroll, so no pill is ever clipped/hidden.
  return (
    <div className={cn("flex w-full flex-wrap items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export function Suggestion({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) {
  return (
    <Button
      className={cn("cursor-pointer rounded-full px-4", className)}
      onClick={() => onClick?.(suggestion)}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
}
