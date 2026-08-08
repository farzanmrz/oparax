"use client";

import { PlusIcon, XIcon as RemoveIcon } from "lucide-react";
import type { ClipboardEvent, KeyboardEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { splitList } from "@/lib/split-list";

export function SourceRow({
  label,
  tone,
  icon,
  display,
  variant = "row",
  status = "active",
  statusLabel,
  removeDisabled = false,
  onRemove,
}: {
  label: string;
  tone: "x" | "website";
  icon?: ReactNode;
  display?: ReactNode;
  variant?: "row" | "chip";
  status?: "active" | "pending" | "failed";
  statusLabel?: string;
  removeDisabled?: boolean;
  onRemove: () => void;
}) {
  // Create-form chips are active-only, so status and its label intentionally stay row-only.
  if (variant === "chip") {
    return (
      <li className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--chip-x-bg)] py-1 pl-2.5 pr-0.5 desk:min-h-9">
        {icon ? (
          <span className="flex size-[15px] shrink-0 items-center justify-center">{icon}</span>
        ) : null}
        <span className="max-w-[16rem] truncate text-sm text-text-title">{display ?? label}</span>
        <button
          aria-label={`Remove ${label}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-text-muted outline-none hover:bg-destructive/12 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring desk:size-7"
          disabled={removeDisabled}
          onClick={onRemove}
          type="button"
        >
          <RemoveIcon aria-hidden="true" className="size-4 desk:size-3.5" />
        </button>
      </li>
    );
  }

  const surface =
    status === "pending"
      ? "bg-warning/12"
      : status === "failed"
        ? "bg-destructive/12"
        : tone === "x"
          ? "bg-[var(--chip-x-bg)]"
          : "bg-[var(--chip-web-bg)]";
  const labelClass =
    status === "pending"
      ? "text-warning"
      : status === "failed"
        ? "text-danger-text"
        : "text-text-title";
  const action = status === "pending" ? "Cancel" : status === "failed" ? "Dismiss" : "Remove";

  return (
    <li
      className={`flex min-h-11 min-w-0 items-center rounded-md border border-[var(--card-border)] py-1.5 pl-3 desk:min-h-9 ${surface}`}
    >
      {icon ? (
        <span
          className={`mr-2 flex size-[15px] shrink-0 items-center justify-center ${display ? "self-start mt-0.5" : ""}`}
        >
          {icon}
        </span>
      ) : null}
      <span
        className={`min-w-0 flex-1 break-words text-sm [overflow-wrap:anywhere] ${display ? "self-start" : ""} ${labelClass}`}
      >
        {display ?? label}
      </span>
      {status !== "active" ? (
        <span
          className={`ml-2 shrink-0 text-xs ${status === "pending" ? "text-warning" : "text-danger-text"}`}
        >
          {status === "pending" ? "Pending" : (statusLabel ?? "Couldn’t set up")}
        </span>
      ) : null}
      <button
        aria-label={`${action} ${label}`}
        className="ml-1 flex size-11 shrink-0 items-center justify-center rounded-md text-text-muted outline-none hover:bg-destructive/12 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring desk:size-9"
        disabled={removeDisabled}
        onClick={onRemove}
        type="button"
      >
        <RemoveIcon aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}

export function AddSourceField({
  value,
  placeholder,
  disabled,
  ariaLabel,
  inputMode = "text",
  onChange,
  onSubmit,
  onBlur,
  onCommitParts,
  className = "mt-4",
}: {
  value: string;
  placeholder: string;
  disabled: boolean;
  ariaLabel: string;
  inputMode?: "text" | "url";
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onBlur?: () => void;
  onCommitParts?: (parts: string[]) => string[];
  className?: string;
}) {
  function handleChange(raw: string, opts?: { commitAll?: boolean; forceCommit?: boolean }) {
    if (!onCommitParts) {
      onChange(raw);
      return;
    }
    const commaAdded = (raw.match(/,/g)?.length ?? 0) > (value.match(/,/g)?.length ?? 0);
    if (!opts?.commitAll && !opts?.forceCommit && !commaAdded) {
      onChange(raw);
      return;
    }
    const endsWithComma = /,\s*$/.test(raw);
    const segments = raw.split(",");
    const remainder = opts?.commitAll || endsWithComma ? "" : (segments.pop() ?? "");
    const parts = segments.flatMap((segment) => splitList(segment));
    const rejected = parts.length ? onCommitParts(parts) : [];
    onChange([...rejected, remainder.trimStart()].filter(Boolean).join(" "));
  }

  function commitAll() {
    if (!onCommitParts) {
      onSubmit?.();
      return;
    }
    handleChange(value, { commitAll: true });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitAll();
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    if (!onCommitParts) return;
    event.preventDefault();
    const selectionStart = event.currentTarget.selectionStart ?? value.length;
    const selectionEnd = event.currentTarget.selectionEnd ?? value.length;
    const pasted = event.clipboardData.getData("text").replace(/[\s\n]+/g, ",");
    handleChange(`${value.slice(0, selectionStart)}${pasted}${value.slice(selectionEnd)}`, {
      forceCommit: true,
    });
  }

  return (
    <div
      className={`${className} flex min-h-11 items-center rounded-md border border-dashed border-input bg-[var(--input-bg)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50`}
    >
      <input
        aria-label={ariaLabel}
        autoCapitalize="none"
        autoCorrect="off"
        className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-text-muted desk:h-9 desk:text-sm"
        disabled={disabled}
        enterKeyHint="done"
        inputMode={inputMode}
        onBlur={() => onBlur?.()}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        spellCheck={false}
        value={value}
      />
      <Button
        aria-label={ariaLabel}
        className="size-11 desk:size-9"
        disabled={disabled || !value.trim()}
        onMouseDown={(event) => event.preventDefault()}
        onClick={commitAll}
        size="icon"
        type="button"
        variant="ghost"
      >
        <PlusIcon />
      </Button>
    </div>
  );
}

export function FieldMessage({ children, error = false }: { children: string; error?: boolean }) {
  return (
    <p
      className={`mt-3 text-sm ${error ? "text-destructive" : "text-text-muted"}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
