"use client";

// Website adds are instant (#106): submitting a site renders a pending chip immediately —
// `startWebsiteOnboarding` only does a fast synchronous reservation, never the billed
// onboarding call — and the chip resolves on its own via `useWebsiteOnboardingStatus`
// polling, to a plain chip (done) or a red chip (failed, dismiss/retype to retry). The input
// is never blocked while onboarding runs. Pending/failed/resolved state is keyed by the
// normalized URL string so a purely local optimistic add reconciles cleanly with what the
// poll later reports for the exact same site.

import { GlobeIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { BandCard } from "@/components/band-card";
import { Button } from "@/components/ui/button";
import { useWebsiteOnboardingStatus } from "@/lib/sources/use-website-onboarding-status";
import { MAX_WEBSITES, normalizeSourceUrl } from "@/lib/websites";
import { MAX_TRACKED_HANDLES } from "@/lib/x/handle";
import { splitHandles } from "@/lib/x/handle-input";
import { addTrackedHandles, removeTrackedHandle } from "../actions";
import { removeWebsite, startWebsiteOnboarding } from "./actions";

function XIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
    </svg>
  );
}

// Grace period so a poll already in flight when the user adds or dismisses a site can't
// clobber that optimistic change for the ~2s until the next poll catches up with the server.
const RECONCILE_GRACE_MS = 2500;

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
  const [, startWebsiteTransition] = useTransition();
  // Pending/failed state (#106) — keyed by the normalized URL string, see the header comment.
  const [pendingUrls, setPendingUrls] = useState<ReadonlySet<string>>(new Set());
  const pendingUrlsRef = useRef(pendingUrls);
  pendingUrlsRef.current = pendingUrls;
  const [failedUrls, setFailedUrls] = useState<ReadonlyMap<string, string>>(new Map());
  // A site that was pending and, on a later poll, is neither pending nor failed succeeded —
  // rendered as a plain chip immediately rather than waiting for a full page reload to pick it
  // up from the server-rendered `websites` prop (#106 finding #1).
  const [resolvedUrls, setResolvedUrls] = useState<ReadonlySet<string>>(new Set());
  // Grace-period guards (#106 finding #7) — entries expire after RECONCILE_GRACE_MS.
  const recentlyAddedRef = useRef<Map<string, number>>(new Map());
  const recentlyDismissedRef = useRef<Map<string, number>>(new Map());
  const atHandleLimit = trackedHandles.length >= MAX_TRACKED_HANDLES;
  const websiteCount = new Set([...websites, ...resolvedUrls, ...pendingUrls]).size;
  const atWebsiteLimit = websiteCount >= MAX_WEBSITES;

  // One read finds creation-time pending rows; a timer runs only while a row is pending.
  const {
    entries: polledEntries,
    readError,
    retry: retryStatus,
  } = useWebsiteOnboardingStatus(deskId, {
    refreshKey: pendingUrls.size,
  });
  useEffect(() => {
    if (readError) return;
    const now = Date.now();
    for (const [url, at] of recentlyAddedRef.current) {
      if (now - at > RECONCILE_GRACE_MS) recentlyAddedRef.current.delete(url);
    }
    for (const [url, at] of recentlyDismissedRef.current) {
      if (now - at > RECONCILE_GRACE_MS) recentlyDismissedRef.current.delete(url);
    }

    const serverPending = new Set(
      polledEntries.filter((e) => e.status === "pending").map((e) => e.url),
    );
    const serverFailed = new Map(
      polledEntries
        .filter((e) => e.status === "failed_validation")
        .filter((e) => !recentlyAddedRef.current.has(e.url))
        .map((e) => [e.url, e.errorCode ?? "failed"]),
    );

    const prevPending = pendingUrlsRef.current;
    const nextPending = new Set(serverPending);
    // Keep a just-added url pending even if this poll started before the reservation landed.
    for (const url of recentlyAddedRef.current.keys()) {
      if (prevPending.has(url) && !serverFailed.has(url)) nextPending.add(url);
    }
    // Don't let a stale poll resurrect something the user just dismissed.
    for (const url of recentlyDismissedRef.current.keys()) nextPending.delete(url);

    const resolved = [...prevPending].filter(
      (url) =>
        !nextPending.has(url) && !serverFailed.has(url) && !recentlyDismissedRef.current.has(url),
    );
    setPendingUrls(nextPending);
    if (resolved.length > 0) setResolvedUrls((current) => new Set([...current, ...resolved]));
    setFailedUrls(() => {
      const next = new Map(serverFailed);
      for (const url of recentlyDismissedRef.current.keys()) next.delete(url);
      return next;
    });
  }, [polledEntries, readError]);

  // Once the server-rendered `websites` prop catches up (a later navigation/revalidation), stop
  // tracking the url as separately "resolved" — it's now just an ordinary entry in `websites`.
  useEffect(() => {
    setResolvedUrls((current) => {
      if (current.size === 0) return current;
      const next = new Set([...current].filter((url) => !websites.includes(url)));
      return next.size === current.size ? current : next;
    });
  }, [websites]);

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

  // One site per submit, unlike the X-handles field's batch paste: onboarding runs real
  // discovery and a billed model call per site, so there is no equivalent of "commit a
  // comma-separated blob" here. The chip renders the moment this fires and the input clears
  // immediately; a not-ok return (bad URL, limit, unreachable) rolls the optimistic chip back.
  function addWebsite() {
    const raw = websiteInput.trim();
    if (!raw) return;
    const normalized = normalizeSourceUrl(raw);
    const priorFailed = normalized ? failedUrls.get(normalized.toString()) : undefined;
    setWebsiteError(null);
    setWebsiteInput("");
    if (normalized) {
      const url = normalized.toString();
      recentlyAddedRef.current.set(url, Date.now());
      setPendingUrls((current) => new Set(current).add(url));
      setResolvedUrls((current) => {
        if (!current.has(url)) return current;
        const next = new Set(current);
        next.delete(url);
        return next;
      });
      setFailedUrls((current) => {
        if (!current.has(url)) return current;
        const next = new Map(current);
        next.delete(url);
        return next;
      });
    }
    startWebsiteTransition(async () => {
      const result = await startWebsiteOnboarding(deskId, raw);
      if (!result.ok) {
        setWebsiteError(result.error);
        if (normalized) {
          const url = normalized.toString();
          recentlyAddedRef.current.delete(url);
          setPendingUrls((current) => {
            const next = new Set(current);
            next.delete(url);
            return next;
          });
          if (priorFailed) setFailedUrls((current) => new Map(current).set(url, priorFailed));
        }
      }
    });
  }

  // Doubles as "cancel" for a pending chip and "dismiss" for a failed one — remove_source_config
  // deletes whatever row is there (pending, failed_validation, or active) uniformly.
  function removeSite(url: string) {
    setWebsiteError(null);
    const wasResolved = resolvedUrls.has(url);
    const wasPending = pendingUrls.has(url);
    const failedError = failedUrls.get(url);
    recentlyDismissedRef.current.set(url, Date.now());
    recentlyAddedRef.current.delete(url);
    setResolvedUrls((current) => {
      if (!current.has(url)) return current;
      const next = new Set(current);
      next.delete(url);
      return next;
    });
    setPendingUrls((current) => {
      if (!current.has(url)) return current;
      const next = new Set(current);
      next.delete(url);
      return next;
    });
    setFailedUrls((current) => {
      if (!current.has(url)) return current;
      const next = new Map(current);
      next.delete(url);
      return next;
    });
    startWebsiteTransition(async () => {
      const result = await removeWebsite(deskId, url);
      if (!result.ok) {
        recentlyDismissedRef.current.delete(url);
        if (wasResolved) setResolvedUrls((current) => new Set(current).add(url));
        if (wasPending) setPendingUrls((current) => new Set(current).add(url));
        if (failedError) setFailedUrls((current) => new Map(current).set(url, failedError));
        setWebsiteError(result.error);
      }
    });
  }

  const pendingChips = [...pendingUrls].filter((url) => !websites.includes(url));
  const failedChips = [...failedUrls.keys()].filter((url) => !websites.includes(url));
  const resolvedChips = [...resolvedUrls].filter(
    (url) => !websites.includes(url) && !pendingUrls.has(url) && !failedUrls.has(url),
  );

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
              removeDisabled={isHandlePending}
              tone="x"
            />
          ))}
        </div>
        {!atHandleLimit ? (
          <AddSourceField
            disabled={isHandlePending}
            ariaLabel="Add X accounts"
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
        <SourceCount count={websiteCount} limit={MAX_WEBSITES} />
        <div className="mt-4 flex flex-wrap gap-2">
          {websites.map((url) => (
            <SourceChip key={url} label={url} onRemove={() => removeSite(url)} tone="website" />
          ))}
          {resolvedChips.map((url) => (
            <SourceChip key={url} label={url} onRemove={() => removeSite(url)} tone="website" />
          ))}
          {pendingChips.map((url) => (
            <SourceChip
              key={url}
              label={url}
              onRemove={() => removeSite(url)}
              status="pending"
              tone="website"
            />
          ))}
          {failedChips.map((url) => (
            <SourceChip
              key={url}
              label={url}
              onRemove={() => removeSite(url)}
              status="failed"
              tone="website"
            />
          ))}
        </div>
        {!atWebsiteLimit ? (
          <AddSourceField
            disabled={false}
            ariaLabel="Add a website"
            onChange={setWebsiteInput}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addWebsite();
            }}
            onSubmit={addWebsite}
            placeholder="Add a website — example.com"
            value={websiteInput}
          />
        ) : null}
        {websiteError ? <FieldMessage error>{websiteError}</FieldMessage> : null}
        {readError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            Couldn&apos;t check website setup status.{" "}
            <button className="underline" onClick={retryStatus} type="button">
              Retry
            </button>
          </p>
        ) : null}
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

/** `status` carries an onboarding chip's lifecycle (amber "— pending" / red "— couldn't set
 *  up", per DESIGN.md's stable color meanings); the remove button doubles as Cancel (pending)
 *  and Dismiss (failed), so it is never disabled on a status chip — `removeDisabled` only
 *  guards active chips whose removal transition is in flight. */
function SourceChip({
  label,
  tone,
  status = "active",
  removeDisabled = false,
  onRemove,
}: {
  label: string;
  tone: "x" | "website";
  status?: "active" | "pending" | "failed";
  removeDisabled?: boolean;
  onRemove: () => void;
}) {
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
    <span className={`flex min-w-0 items-center rounded-md pl-3 ${surface}`}>
      <span className={`max-w-60 truncate text-sm ${labelClass}`}>
        {status === "pending"
          ? `${label} — pending`
          : status === "failed"
            ? `${label} — couldn't set up`
            : label}
      </span>
      <button
        aria-label={`${action} ${label}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-destructive outline-none hover:bg-destructive/12 focus-visible:ring-2 focus-visible:ring-ring desk:size-8"
        disabled={removeDisabled}
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
  ariaLabel,
  onChange,
  onSubmit,
  onBlur,
  onKeyDown,
  onPaste,
}: {
  value: string;
  placeholder: string;
  disabled: boolean;
  ariaLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mt-4 flex min-h-11 items-center rounded-md border border-dashed border-input bg-[var(--input-bg)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
      <input
        aria-label={ariaLabel}
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
