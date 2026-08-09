"use client";

// Website adds are instant (#106): submitting a site renders a pending chip immediately —
// `startWebsiteOnboarding` only does a fast synchronous reservation, never the billed
// onboarding call — and the chip resolves on its own via `useWebsiteOnboardingStatus`
// polling, to a plain chip (done) or a red chip (failed, dismiss/retype to retry). The input
// is never blocked while onboarding runs. Pending/failed/resolved state is keyed by the
// normalized URL string so a purely local optimistic add reconciles cleanly with what the
// poll later reports for the exact same site.

import { GlobeIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { BandCard } from "@/components/band-card";
import { SiteFavicon } from "@/components/site-favicon";
import { AddSourceField, FieldMessage, SourceRow } from "@/components/source-field";
import { useWebsiteOnboardingStatus } from "@/lib/sources/use-website-onboarding-status";
import { splitList } from "@/lib/split-list";
import { displaySourceUrl, MAX_WEBSITES, normalizeSourceUrl } from "@/lib/websites";
import { MAX_TRACKED_HANDLES, normalizeValidHandle } from "@/lib/x/handle";
import { addTrackedHandles, removeTrackedHandle } from "../actions";
import { removeWebsite, startWebsiteOnboarding } from "./actions";

function XLogo() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
    </svg>
  );
}

// Grace period so a poll already in flight when the user adds or dismisses a site can't
// clobber that optimistic change for the ~2s until the next poll catches up with the server.
const RECONCILE_GRACE_MS = 2500;
const FAILED_STATUS_COPY: Readonly<Record<string, string>> = {
  no_beat_section: "Nothing on your beat found",
  no_detection_mechanism: "No articles found to watch",
  unreachable: "Couldn't reach this site",
  schema_validation_failed: "Setup failed",
  unexpected_error: "Setup failed",
};

/** Onboarded display facts for one website chip, keyed by the config's exact url string
 *  (`agents.websites` entries and `source_configs.url` share the same normalized form).
 *  A chip whose url has no entry — a just-added site the server render predates, or a
 *  failed read — falls back to showing its pasted URL as before. */
export type WebsiteDetail = {
  displayName: string;
  domain: string;
  trackedUrl?: string;
};

export function SourcesCard({
  deskId,
  trackedHandles,
  websiteDetails,
  websites,
}: {
  deskId: string;
  trackedHandles: readonly string[];
  websiteDetails: Readonly<Record<string, WebsiteDetail>>;
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
  const [resolvedWebsiteDetails, setResolvedWebsiteDetails] = useState<
    Readonly<Record<string, WebsiteDetail>>
  >({});
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
    const nextResolvedDetails = Object.fromEntries(
      polledEntries
        .filter(
          (entry): entry is typeof entry & { displayName: string } =>
            entry.status === "active" && Boolean(entry.displayName),
        )
        .map((entry) => [
          entry.url,
          {
            displayName: entry.displayName,
            domain: (entry.domain ?? new URL(entry.url).hostname).replace(/^www\./i, ""),
            trackedUrl: entry.trackedUrl,
          },
        ]),
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
    if (Object.keys(nextResolvedDetails).length > 0) {
      setResolvedWebsiteDetails((current) => ({ ...current, ...nextResolvedDetails }));
    }
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
    setResolvedWebsiteDetails((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([url]) => !websites.includes(url)),
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [websites]);

  function commitHandles(raw: string) {
    const candidates = splitList(raw);
    if (candidates.length === 0) return;
    const validHandles = candidates.flatMap((handle) => {
      const normalized = normalizeValidHandle(handle);
      return normalized ? [normalized] : [];
    });
    const hasInvalidHandle = validHandles.length !== candidates.length;
    setHandleError(
      hasInvalidHandle
        ? "Enter a valid X handle — letters, numbers, and underscores, up to 15."
        : null,
    );
    setHandleNotice(null);
    if (validHandles.length === 0) return;
    startHandleTransition(async () => {
      const result = await addTrackedHandles(deskId, validHandles.join(" "));
      if (!result.ok) {
        setHandleError(result.error);
        return;
      }
      if (result.dropped > 0) {
        setHandleNotice(
          `${result.dropped} ${result.dropped === 1 ? "handle was" : "handles were"} not added — this agent is at its ${MAX_TRACKED_HANDLES}-account limit.`,
        );
      }
    });
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
  function addWebsite(input = websiteInput) {
    const raw = input.trim();
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

  function commitWebsiteParts(parts: string[]): string[] {
    if (parts.length !== 1) {
      setWebsiteError("Add one website at a time.");
      return parts;
    }
    addWebsite(parts[0]);
    return [];
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
  const firstHonestMissUrl = failedChips.find((url) => {
    const code = failedUrls.get(url);
    return code === "no_beat_section" || code === "no_detection_mechanism";
  });
  const resolvedChips = [...resolvedUrls].filter(
    (url) => !websites.includes(url) && !pendingUrls.has(url) && !failedUrls.has(url),
  );

  return (
    <div className="grid gap-[var(--page-rhythm-mobile)] [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))] desk:gap-[var(--page-rhythm-web)]">
      <BandCard
        headerAside={
          <SourceCount
            count={trackedHandles.length}
            limit={MAX_TRACKED_HANDLES}
            noun="X accounts"
          />
        }
        icon={<XLogo />}
        title="X Accounts"
      >
        <ul className="grid gap-2 desk:grid-cols-2">
          {trackedHandles.map((handle) => (
            <SourceRow
              key={handle}
              label={`@${handle}`}
              onRemove={() => removeHandle(handle)}
              removeDisabled={isHandlePending}
              tone="x"
            />
          ))}
        </ul>
        {!atHandleLimit ? (
          <AddSourceField
            disabled={isHandlePending}
            ariaLabel="Add X accounts"
            onChange={setHandleInput}
            onCommitParts={(parts) => {
              commitHandles(parts.join(" "));
              return parts.filter((part) => !normalizeValidHandle(part) && !part.startsWith("@@"));
            }}
            placeholder={isHandlePending ? "Adding…" : "Add X accounts — usernames"}
            value={handleInput}
          />
        ) : null}
        {handleError ? <FieldMessage error>{handleError}</FieldMessage> : null}
        {handleNotice ? <FieldMessage>{handleNotice}</FieldMessage> : null}
      </BandCard>

      <BandCard
        headerAside={<SourceCount count={websiteCount} limit={MAX_WEBSITES} noun="websites" />}
        icon={<GlobeIcon />}
        title="Websites"
      >
        <ul className="grid gap-2">
          {websites.map((url) => {
            const { path, name } = websiteChipLabel(url, websiteDetails[url]);
            return (
              <SourceRow
                icon={<SiteFavicon domain={websiteDetails[url]?.domain} url={url} />}
                key={url}
                display={<WebsiteChipDisplay name={name} path={path} />}
                label={name ? `${name} · ${path}` : path}
                onRemove={() => removeSite(url)}
                tone="website"
              />
            );
          })}
          {resolvedChips.map((url) => {
            const detail = resolvedWebsiteDetails[url] ?? websiteDetails[url];
            const { path, name } = websiteChipLabel(url, detail);
            return (
              <SourceRow
                icon={<SiteFavicon domain={detail?.domain} url={url} />}
                key={url}
                display={<WebsiteChipDisplay name={name} path={path} />}
                label={name ? `${name} · ${path}` : path}
                onRemove={() => removeSite(url)}
                tone="website"
              />
            );
          })}
          {pendingChips.map((url) => (
            <SourceRow
              icon={<SiteFavicon url={url} />}
              key={url}
              display={<SingleLineLabel>{websiteName(url)}</SingleLineLabel>}
              label={websiteName(url)}
              onRemove={() => removeSite(url)}
              status="pending"
              tone="website"
            />
          ))}
          {failedChips.map((url) => (
            <SourceRow
              icon={<SiteFavicon url={url} />}
              key={url}
              display={<SingleLineLabel>{websiteName(url)}</SingleLineLabel>}
              label={websiteName(url)}
              onRemove={() => removeSite(url)}
              status="failed"
              statusLabel={FAILED_STATUS_COPY[failedUrls.get(url) ?? ""] ?? "Couldn't set up"}
              tone="website"
            />
          ))}
        </ul>
        {firstHonestMissUrl ? (
          <FieldMessage>{`Couldn't find a section of ${displaySourceUrl(new URL(firstHonestMissUrl).origin)} to watch — paste a link to the section you actually read there.`}</FieldMessage>
        ) : null}
        {!atWebsiteLimit ? (
          <AddSourceField
            disabled={false}
            ariaLabel="Add a website"
            onChange={setWebsiteInput}
            onCommitParts={commitWebsiteParts}
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

function SourceCount({ count, limit, noun }: { count: number; limit: number; noun: string }) {
  return (
    <>
      <span
        className={`text-sm tabular-nums ${count >= limit ? "text-destructive" : "text-text-label"}`}
      >
        {count} / {limit}
      </span>
      {count >= limit ? (
        <span className="sr-only">
          Maximum of {limit} {noun} reached.
        </span>
      ) : null}
    </>
  );
}

function websiteName(value: string): string {
  return displaySourceUrl(value);
}

function websiteChipLabel(
  url: string,
  detail?: { displayName?: string; domain?: string; trackedUrl?: string },
): { path: string; name?: string } {
  const path = displaySourceUrl(detail?.trackedUrl ?? url);
  const rawName = detail?.displayName?.trim() ?? "";
  const name = rawName.replace(/^www\./i, "");
  const bareDomain = (detail?.domain ?? "").replace(/^www\./i, "").toLowerCase();
  const showName =
    name.length > 0 &&
    name.toLowerCase() !== bareDomain &&
    name.toLowerCase() !== path.toLowerCase();
  return { path, name: showName ? name : undefined };
}

function WebsiteChipDisplay({ name, path }: { name?: string; path: string }) {
  return (
    <SingleLineLabel>
      {name ? (
        <>
          {name}
          <span className="text-text-muted"> · </span>
        </>
      ) : null}
      <span className={name ? "text-text-muted" : undefined}>{path}</span>
    </SingleLineLabel>
  );
}

function SingleLineLabel({ children }: { children: ReactNode }) {
  return <span className="block truncate whitespace-nowrap">{children}</span>;
}

/** `status` carries website onboarding lifecycle. The close action doubles as Cancel for a
 * pending row and Dismiss for a failed row; `removeDisabled` only guards active X rows whose
 * removal transition is already in flight. */
