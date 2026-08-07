"use client";

import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import twitterText from "twitter-text";
import type { FeedDraft } from "@/lib/agent/feed-shared";
import { cn } from "@/lib/utils";
import { editDraft } from "./actions";
import { PostToXControl } from "./post-to-x-control";

function CharCounter({ text, xLimit }: { text: string; xLimit: number }) {
  const length = twitterText.parseTweet(text).weightedLength;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(draft.draftText);
  const [baseline, setBaseline] = useState(draft.draftText);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [optimisticallyEdited, setOptimisticallyEdited] = useState(false);
  const syncedDraftId = useRef(draft.draftId);

  const dirty = text !== baseline;

  useEffect(() => {
    if (syncedDraftId.current === draft.draftId || dirty || committing) return;
    syncedDraftId.current = draft.draftId;
    setText(draft.draftText);
    setBaseline(draft.draftText);
    setError(null);
    setOptimisticallyEdited(false);
  }, [committing, dirty, draft]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  });

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
        <textarea
          aria-label="Draft text"
          className="field-sizing-content min-h-[3rem] w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-draft text-[15px] leading-[1.52] text-text-draft caret-primary outline-none selection:bg-primary/30 desk:text-[16.5px]"
          onBlur={() => void commitEdit()}
          onChange={(event) => setText(event.target.value)}
          readOnly={readOnly}
          ref={textareaRef}
          rows={1}
          spellCheck={false}
          value={text}
        />
        {error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col desk:flex-row desk:items-center desk:justify-between desk:px-6 desk:pb-4">
        <div className="flex items-center justify-end gap-2 px-[14px] pb-2 desk:justify-start desk:px-0 desk:pb-0">
          <CharCounter text={text} xLimit={charLimit} />
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
          xLinked={xLinked}
        />
      </div>
    </section>
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
}) {
  const statusClass =
    "flex h-10 w-full items-center justify-center gap-1.5 rounded-b-[9px] px-4 text-sm desk:h-[30px] desk:w-auto desk:rounded-md";

  if (posting) {
    return (
      <span className={cn(statusClass, "bg-primary/50 text-primary-foreground")}>Posting…</span>
    );
  }
  if (confirmed) {
    return (
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
    );
  }
  if (ambiguous) {
    return (
      <span
        className={cn(statusClass, "bg-warning/12 text-warning")}
        title="Couldn't confirm this reached X — check your account on X"
      >
        Unconfirmed
      </span>
    );
  }
  return (
    <PostToXControl
      charLimit={charLimit}
      disabled={disabled}
      draftId={draftId}
      draftText={draftText}
      onPendingChange={onPostPendingChange}
      xLinked={xLinked}
    />
  );
}
