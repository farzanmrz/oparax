"use client";

import { GlobeIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { type ClipboardEvent, type KeyboardEvent, useState, useTransition } from "react";
import { BandCard } from "@/components/band-card";
import { Button } from "@/components/ui/button";
import { MAX_WEBSITES } from "@/lib/websites";
import { MAX_TRACKED_HANDLES } from "@/lib/x/handle";
import { splitHandles } from "@/lib/x/handle-input";
import { addTrackedHandles, removeTrackedHandle } from "../actions";
import { discoverAndSaveSource, removeWebsite } from "./actions";

function XIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
    </svg>
  );
}

export function SourcesCard({
  deskId,
  trackedHandles,
  websites,
}: {
  deskId: string;
  trackedHandles: readonly string[];
  websites: readonly string[];
}) {
  const [handleInput, setHandleInput] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleNotice, setHandleNotice] = useState<string | null>(null);
  const [isHandlePending, startHandleTransition] = useTransition();
  const [websiteInput, setWebsiteInput] = useState("");
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [isWebsitePending, startWebsiteTransition] = useTransition();
  const atHandleLimit = trackedHandles.length >= MAX_TRACKED_HANDLES;
  const atWebsiteLimit = websites.length >= MAX_WEBSITES;

  function commitHandles(raw: string) {
    if (splitHandles(raw).length === 0) return;
    setHandleError(null);
    setHandleNotice(null);
    startHandleTransition(async () => {
      const result = await addTrackedHandles(deskId, raw);
      if (!result.ok) {
        setHandleError(result.error);
        return;
      }
      if (result.dropped > 0) {
        setHandleNotice(
          `${result.dropped} ${result.dropped === 1 ? "handle was" : "handles were"} not added — this agent is at its ${MAX_TRACKED_HANDLES}-account limit.`,
        );
      }
      setHandleInput("");
    });
  }

  function onHandleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    commitHandles(handleInput);
  }

  function onHandlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/[\s,]/.test(text)) return;
    event.preventDefault();
    commitHandles(`${handleInput} ${text}`);
  }

  function removeHandle(handle: string) {
    setHandleError(null);
    startHandleTransition(async () => {
      const result = await removeTrackedHandle(deskId, handle);
      if (!result.ok) setHandleError(result.error);
    });
  }

  function addWebsite() {
    const raw = websiteInput.trim();
    if (!raw) return;
    setWebsiteError(null);
    startWebsiteTransition(async () => {
      const result = await discoverAndSaveSource(deskId, raw);
      if (!result.ok) {
        setWebsiteError(result.error);
        return;
      }
      setWebsiteInput("");
    });
  }

  function removeSite(url: string) {
    setWebsiteError(null);
    startWebsiteTransition(async () => {
      const result = await removeWebsite(deskId, url);
      if (!result.ok) setWebsiteError(result.error);
    });
  }

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))] desk:gap-6">
      <BandCard icon={<XIcon />} title="X Accounts">
        <SourceCount count={trackedHandles.length} limit={MAX_TRACKED_HANDLES} />
        <div className="mt-4 flex flex-wrap gap-2">
          {trackedHandles.map((handle) => (
            <SourceChip
              key={handle}
              label={`@${handle}`}
              onRemove={() => removeHandle(handle)}
              pending={isHandlePending}
              tone="x"
            />
          ))}
        </div>
        {!atHandleLimit ? (
          <AddSourceField
            disabled={isHandlePending}
            onBlur={() => commitHandles(handleInput)}
            onChange={setHandleInput}
            onKeyDown={onHandleKeyDown}
            onPaste={onHandlePaste}
            onSubmit={() => commitHandles(handleInput)}
            placeholder={isHandlePending ? "Adding…" : "Add X accounts — @ optional"}
            value={handleInput}
          />
        ) : null}
        {handleError ? <FieldMessage error>{handleError}</FieldMessage> : null}
        {handleNotice ? <FieldMessage>{handleNotice}</FieldMessage> : null}
      </BandCard>

      <BandCard icon={<GlobeIcon />} title="Websites">
        <SourceCount count={websites.length} limit={MAX_WEBSITES} />
        <div className="mt-4 flex flex-wrap gap-2">
          {websites.map((url) => (
            <SourceChip
              key={url}
              label={url}
              onRemove={() => removeSite(url)}
              pending={isWebsitePending}
              tone="website"
            />
          ))}
        </div>
        {!atWebsiteLimit ? (
          <AddSourceField
            disabled={isWebsitePending}
            onChange={setWebsiteInput}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addWebsite();
            }}
            onSubmit={addWebsite}
            placeholder={isWebsitePending ? "Discovering…" : "Add a website — example.com"}
            value={websiteInput}
          />
        ) : null}
        {websiteError ? <FieldMessage error>{websiteError}</FieldMessage> : null}
      </BandCard>
    </div>
  );
}

function SourceCount({ count, limit }: { count: number; limit: number }) {
  return (
    <p className="text-sm text-text-muted">
      <span className={count >= limit ? "text-destructive" : "text-text-label"}>{count}</span>/
      {limit}
      {count >= limit ? " · Source limit reached" : " connected"}
    </p>
  );
}

function SourceChip({
  label,
  tone,
  pending,
  onRemove,
}: {
  label: string;
  tone: "x" | "website";
  pending: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={
        tone === "x"
          ? "flex min-w-0 items-center rounded-md bg-[var(--chip-x-bg)] pl-3"
          : "flex min-w-0 items-center rounded-md bg-[var(--chip-web-bg)] pl-3"
      }
    >
      <span className="max-w-60 truncate text-sm text-text-title">{label}</span>
      <button
        aria-label={`Remove ${label}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-destructive outline-none hover:bg-destructive/12 focus-visible:ring-2 focus-visible:ring-ring desk:size-8"
        disabled={pending}
        onClick={onRemove}
        type="button"
      >
        <Trash2Icon aria-hidden="true" className="size-6" />
      </button>
    </span>
  );
}

function AddSourceField({
  value,
  placeholder,
  disabled,
  onChange,
  onSubmit,
  onBlur,
  onKeyDown,
  onPaste,
}: {
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mt-4 flex min-h-11 items-center rounded-md border border-dashed border-input bg-[var(--input-bg)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
      <input
        className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-text-muted desk:h-9 desk:text-sm"
        disabled={disabled}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={placeholder}
        value={value}
      />
      <Button
        aria-label="Add source"
        className="size-11 desk:size-9"
        disabled={disabled || !value.trim()}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onSubmit}
        size="icon"
        type="button"
        variant="ghost"
      >
        <PlusIcon />
      </Button>
    </div>
  );
}

function FieldMessage({ children, error = false }: { children: string; error?: boolean }) {
  return (
    <p
      className={`mt-3 text-sm ${error ? "text-destructive" : "text-text-muted"}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
