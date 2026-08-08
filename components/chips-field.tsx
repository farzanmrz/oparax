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

import { PlusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChipsField({
  className,
  chipLabel,
  chipClassName,
  chips,
  disabled = false,
  inputDisabled,
  inputAriaLabel,
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
  inputMode = "text",
}: {
  /** Container overrides — chiefly `min-h-*` where a field is a primary input and should hold
   *  several rows of chips without the box growing and shrinking as they're added. */
  readonly className?: string;
  readonly chipLabel: (chip: string) => string;
  /** A plain string applies to every chip; a function lets the caller vary the chip's style
   *  per-item (#106 — pending/failed/resolved pill states on the same list). */
  readonly chipClassName?: string | ((chip: string) => string | undefined);
  readonly chips: readonly string[];
  /** Freezes the whole field — chips, removes, and input (the "Coming soon" state). */
  readonly disabled?: boolean;
  readonly inputDisabled: boolean;
  readonly inputAriaLabel?: string;
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
  /** Mobile keyboard layout for the inline input — e.g. "url" for the websites field. */
  readonly inputMode?: "text" | "url";
}) {
  const showPlaceholder = chips.length === 0 && value === "" && !hideInput;
  return (
    <div
      className={cn(
        // Mirrors components/ui/input.tsx's box treatment. `relative` anchors the overlay
        // placeholder below: a native <input> placeholder can never wrap, so a multi-row box
        // showing a long example list needs its own wrapped, non-interactive text layer.
        "relative flex min-h-9 w-full min-w-0 flex-wrap content-start items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        disabled && "pointer-events-none cursor-not-allowed bg-input/50 dark:bg-input/80",
        className,
      )}
    >
      {showPlaceholder ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden py-1.5 pr-12 pl-2.5 text-base leading-relaxed break-words text-muted-foreground desk:pr-10 desk:text-sm"
        >
          {placeholder}
        </span>
      ) : null}
      {chips.map((chip) => (
        <Badge
          className={typeof chipClassName === "function" ? chipClassName(chip) : chipClassName}
          key={chip}
          variant="secondary"
        >
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
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <input
            aria-label={inputAriaLabel}
            // Mobile hygiene: handles and URLs must never be autocapitalized or "corrected",
            // and the keyboard's confirm key reads "done" — which commits via Enter or the
            // blur it triggers, both wired to the same submit.
            autoCapitalize="none"
            autoCorrect="off"
            className="h-6 min-w-32 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed desk:text-sm"
            disabled={disabled || inputDisabled}
            enterKeyHint="done"
            inputMode={inputMode}
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
            spellCheck={false}
            value={value}
          />
          {/* One-by-one typing affordance (mirrors the Sources page's add field): a visible
              Add button so mobile users aren't left guessing that Enter commits a chip. */}
          <Button
            aria-label="Add"
            className="size-11 shrink-0 desk:size-9"
            disabled={disabled || inputDisabled || !value.trim()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSubmit}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PlusIcon />
          </Button>
        </span>
      )}
    </div>
  );
}
