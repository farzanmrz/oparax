"use client";

import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import twitterText from "twitter-text";
import { XEntityText } from "@/components/x-entity-text";
import type { FeedDraft } from "@/lib/agent/feed-shared";
import { cn } from "@/lib/utils";
import { editDraft } from "./actions";
import { PostToXControl } from "./post-to-x-control";

function CharCounter({ length, xLimit }: { length: number; xLimit: number }) {
  return (
    <span
      className={cn(
        "font-mono text-[11.5px] tabular-nums",
        length > xLimit ? "text-destructive" : "text-text-count",
      )}
    >
      {length} chars
    </span>
  );
}

export function DraftBox({
  draft,
  charLimit,
  edited,
  onDraftReplaced,
  postPending,
  onPostPendingChange,
  xLinked,
}: {
  draft: FeedDraft;
  charLimit: number;
  edited: boolean;
  onDraftReplaced: (draftId: string, text: string) => void;
  postPending: boolean;
  onPostPendingChange: (pending: boolean) => void;
  xLinked: boolean;
}) {
  const router = useRouter();
  // FeedItemCard never mounts DraftBox for an undrafted story.
  const draftText = draft.draftText ?? "";
  const [text, setText] = useState(draftText);
  const [baseline, setBaseline] = useState(draftText);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [optimisticallyEdited, setOptimisticallyEdited] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const syncedDraftId = useRef(draft.draftId);

  const dirty = text !== baseline;
  const weightedLength = twitterText.parseTweet(text).weightedLength;
  const isOverLimit = weightedLength > charLimit;

  useEffect(() => {
    if (syncedDraftId.current === draft.draftId || dirty || committing) return;
    syncedDraftId.current = draft.draftId;
    setText(draft.draftText ?? "");
    setBaseline(draft.draftText ?? "");
    setError(null);
    setOptimisticallyEdited(false);
  }, [committing, dirty, draft]);

  const confirmed = Boolean(draft.postedAt && draft.postedUrl);
  const ambiguous = Boolean(draft.postedAt && !draft.postedUrl);
  const posting = Boolean(draft.postingClaimedAt);
  const readOnly = posting || confirmed || committing || postPending;

  async function commitEdit() {
    if (!dirty || committing) return;
    const trimmed = text.trim();
    if (trimmed === baseline.trim()) {
      setText(baseline);
      return;
    }

    setError(null);
    setCommitting(true);
    setOptimisticallyEdited(true);
    try {
      const result = await editDraft(draft.draftId, trimmed);
      if (!result.ok) {
        setOptimisticallyEdited(false);
        setError(result.error);
        return;
      }

      setText(trimmed);
      setBaseline(trimmed);
      onDraftReplaced(result.draftId, trimmed);
      router.refresh();
    } catch {
      setOptimisticallyEdited(false);
      setError("Couldn't save your changes. Please try again.");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <section className="rounded-b-lg border-t border-[var(--draft-border-top)] bg-draft-bg">
      <div className="px-[14px] pt-4 desk:px-6">
        <div className="relative font-draft text-[15px] leading-[1.52] desk:text-[16.5px]">
          <div
            aria-hidden="true"
            className={cn(
              "whitespace-pre-wrap break-words text-text-draft",
              isEditing && "invisible",
            )}
          >
            <XEntityText appendTrailingLineMarker text={text} />
          </div>
          <textarea
            aria-label="Draft text"
            className={cn(
              "absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-draft text-[15px] leading-[1.52] caret-primary outline-none selection:bg-primary/30 desk:text-[16.5px]",
              !isEditing && "text-transparent",
              isEditing && "text-text-draft",
            )}
            onBlur={() => {
              setIsEditing(false);
              void commitEdit();
            }}
            onChange={(event) => setText(event.target.value)}
            onFocus={() => setIsEditing(true)}
            readOnly={readOnly}
            rows={1}
            spellCheck={false}
            value={text}
          />
        </div>
        {error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="mt-[var(--draft-footer-gap-mobile)] flex flex-col desk:mt-[var(--draft-footer-gap-web)] desk:flex-row desk:items-center desk:justify-between desk:px-6 desk:pb-4">
        <div className="hidden items-center justify-end gap-2 px-[14px] desk:flex desk:justify-start desk:px-0 desk:pb-0">
          <CharCounter length={weightedLength} xLimit={charLimit} />
          {edited || optimisticallyEdited ? (
            <span className="text-[11.5px] text-warning">edited</span>
          ) : null}
        </div>
        <DraftAction
          ambiguous={ambiguous}
          charLimit={charLimit}
          confirmed={confirmed}
          disabled={dirty || committing || postPending}
          draftId={draft.draftId}
          draftText={text}
          onPostPendingChange={onPostPendingChange}
          postedUrl={draft.postedUrl}
          posting={posting}
          mobileMetadata={
            <MobilePostMetadata
              edited={edited || optimisticallyEdited}
              isOverLimit={isOverLimit}
              length={weightedLength}
              xLimit={charLimit}
            />
          }
          xLinked={xLinked}
        />
      </div>
    </section>
  );
}

function MobilePostMetadata({
  edited,
  isOverLimit,
  length,
  xLimit,
}: {
  edited: boolean;
  isOverLimit: boolean;
  length: number;
  xLimit: number;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1 px-2.5 text-[10px] desk:hidden"
      >
        {edited ? <span className="text-primary-foreground/65">edited</span> : null}
        <span
          className={cn(
            "inline-flex items-baseline gap-[var(--char-count-gap-mobile)] text-primary-foreground/65",
            isOverLimit && "rounded bg-destructive px-1 py-0.5 text-destructive-foreground",
          )}
        >
          <span className="font-mono tabular-nums">{length}</span>
          <span>chars</span>
        </span>
      </div>
      <span className="sr-only desk:hidden">
        {edited ? "Edited. " : ""}
        {isOverLimit
          ? `Draft is over the ${xLimit}-character limit at ${length} characters.`
          : `Draft is ${length} of ${xLimit} characters.`}
      </span>
    </>
  );
}

function DraftAction({
  posting,
  confirmed,
  ambiguous,
  postedUrl,
  disabled,
  draftId,
  draftText,
  charLimit,
  onPostPendingChange,
  xLinked,
  mobileMetadata,
}: {
  posting: boolean;
  confirmed: boolean;
  ambiguous: boolean;
  postedUrl: string | null;
  disabled: boolean;
  draftId: string;
  draftText: string;
  charLimit: number;
  onPostPendingChange: (pending: boolean) => void;
  xLinked: boolean;
  mobileMetadata: ReactNode;
}) {
  const statusClass =
    "flex h-[var(--post-h-mobile)] w-full items-center justify-center gap-1.5 rounded-b-[9px] px-4 text-sm desk:h-[var(--post-h-web)] desk:w-auto desk:rounded-md";

  if (posting) {
    return (
      <div className="relative">
        <span className={cn(statusClass, "bg-primary/50 text-primary-foreground")}>Posting…</span>
        {mobileMetadata}
      </div>
    );
  }
  if (confirmed) {
    return (
      <div className="relative">
        <a
          className={cn(statusClass, "bg-success/12 text-success")}
          href={postedUrl ?? "#"}
          rel="noreferrer"
          target="_blank"
        >
          <CheckIcon aria-hidden="true" className="size-3.5" />
          Posted · view on X
          <ExternalLinkIcon aria-hidden="true" className="size-3" />
        </a>
        {mobileMetadata}
      </div>
    );
  }
  if (ambiguous) {
    return (
      <div className="relative">
        <span
          className={cn(statusClass, "bg-warning/12 text-warning")}
          title="Couldn't confirm this reached X — check your account on X"
        >
          Unconfirmed
        </span>
        {mobileMetadata}
      </div>
    );
  }
  return (
    <PostToXControl
      charLimit={charLimit}
      disabled={disabled}
      draftId={draftId}
      draftText={draftText}
      onPendingChange={onPostPendingChange}
      mobileMetadata={mobileMetadata}
      xLinked={xLinked}
    />
  );
}
