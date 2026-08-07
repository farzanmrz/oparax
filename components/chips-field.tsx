"use client";

// components/chips-field.tsx
//
// One bordered box holding already-added entries as removable chips, followed by an inline input
// that grows to fill the remaining space — the shape a tag/handle field is expected to have.
//
// Extracted from app/agents/[id]/sources/sources-card.tsx so the create-agent form and Sources
// card share ONE treatment. They previously diverged: Sources rendered chips inside the box (right)
// while create-agent stacked them in a separate row above a plain <Input> (wrong — the chips read
// as unrelated content rather than as the field's current value). A second copy is how that drift
// happened, so both import this now.
//
// The box deliberately mirrors components/ui/input.tsx's border/background/focus treatment: it
// must sit in a form beside real Inputs and be indistinguishable from them, per the uniform-fields
// rule in .claude/rules/components.md.

import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ChipsField({
  className,
  chipLabel,
  chipClassName,
  chips,
  disabled = false,
  inputDisabled,
  hideInput = false,
  onChange,
  onKeyDown,
  onPaste,
  onBlur,
  onRemove,
  onSubmit,
  placeholder,
  removeDisabled,
  removeLabel,
  value,
}: {
  /** Container overrides — chiefly `min-h-*` where a field is a primary input and should hold
   *  several rows of chips without the box growing and shrinking as they're added. */
  readonly className?: string;
  readonly chipLabel: (chip: string) => string;
  readonly chipClassName?: string;
  readonly chips: readonly string[];
  /** Freezes the whole field — chips, removes, and input (the "Coming soon" state). */
  readonly disabled?: boolean;
  readonly inputDisabled: boolean;
  /** Keep committed chips visible while removing the add-input at the cap. */
  readonly hideInput?: boolean;
  readonly onChange: (value: string) => void;
  /** Optional extra key handling. Enter is always intercepted for `onSubmit` first. */
  readonly onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  readonly onBlur?: () => void;
  readonly onRemove: (chip: string) => void;
  readonly onSubmit: () => void;
  readonly placeholder: string;
  readonly removeDisabled: boolean;
  readonly removeLabel: (chip: string) => string;
  readonly value: string;
}) {
  return (
    <div
      className={cn(
        // Mirrors components/ui/input.tsx's box treatment.
        "flex min-h-9 w-full min-w-0 flex-wrap content-start items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        disabled && "pointer-events-none cursor-not-allowed bg-input/50 dark:bg-input/80",
        className,
      )}
    >
      {chips.map((chip) => (
        <Badge className={chipClassName} key={chip} variant="secondary">
          {chipLabel(chip)}
          <button
            aria-label={removeLabel(chip)}
            className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none desk:size-6"
            disabled={disabled || removeDisabled}
            onClick={() => onRemove(chip)}
            type="button"
          >
            <XIcon aria-hidden="true" className="size-3" />
          </button>
        </Badge>
      ))}
      {hideInput ? null : (
        <input
          className="h-6 min-w-40 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed desk:text-sm"
          disabled={disabled || inputDisabled}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
              return;
            }
            onKeyDown?.(e);
          }}
          onPaste={onPaste}
          placeholder={placeholder}
          value={value}
        />
      )}
    </div>
  );
}
