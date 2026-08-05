"use client";

import { CheckIcon, HistoryIcon, PencilIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import twitterText from "twitter-text";

import { Button } from "@/components/ui/button";
import type { FeedDraft } from "@/lib/agent/feed-shared";
import { cn } from "@/lib/utils";
import { editDraft } from "./actions";
import { DraftHistoryDialog } from "./draft-history-dialog";
import { PostToXControl } from "./post-to-x-control";

function CharCounter({ text, xLimit }: { text: string; xLimit: number }) {
  const length = twitterText.parseTweet(text).weightedLength;
  const limit = xLimit;
  const overLimit = length > limit;
  const nearLimit = !overLimit && length / limit > 0.9;
  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        nearLimit ? "text-warning" : overLimit ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length} / {limit}
    </span>
  );
}

function fitTextArea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function DraftBox({
  draft,
  charLimit,
  xLinked,
}: {
  draft: FeedDraft;
  charLimit: number;
  xLinked: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(draft.text);
  const [focused, setFocused] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmed = Boolean(draft.postedAt && draft.postedUrl);
  const ambiguous = Boolean(draft.postedAt && !draft.postedUrl);
  const dirty = text.trim() !== draft.text.trim();

  // biome-ignore lint/correctness/useExhaustiveDependencies: winner-row identity is the reset key by design.
  useEffect(() => {
    setText(draft.text);
    setFocused(false);
    setError(null);
  }, [draft.draftId]);

  useEffect(() => {
    fitTextArea(textareaRef.current);
  });

  const handleFocus = () => setFocused(true);

  const focusEditor = () => {
    const target = textareaRef.current;
    if (!target) return;
    target.focus();
    const end = target.value.length;
    target.setSelectionRange(end, end);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleSave = () => {
    const trimmed = text.trim();
    setError(null);
    startTransition(async () => {
      const result = await editDraft(draft.draftId, trimmed);
      if (result.ok) {
        toast.success("Draft updated");
        return;
      }
      setError(result.error);
    });
  };

  const canRevert = !confirmed;

  return (
    <section
      className={
        "mt-[clamp(13px,1.5cqw,17px)] rounded-[7px] border bg-secondary pt-[clamp(13px,1.5cqw,17px)] px-[clamp(14px,1.6cqw,18px)] pb-[clamp(8px,0.9cqw,10px)]"
      }
    >
      <textarea
        aria-label="Draft text"
        className={
          "font-sans w-full resize-none overflow-hidden border-none bg-transparent p-0 text-[clamp(14.5px,1.68cqw,17px)] leading-[1.5] text-foreground outline-none caret-primary selection:bg-primary/30"
        }
        onBlur={handleBlur}
        onChange={(event) => setText(event.target.value)}
        onFocus={handleFocus}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          setText(draft.text);
          if (textareaRef.current) textareaRef.current.blur();
        }}
        readOnly={confirmed}
        ref={textareaRef}
        spellCheck={false}
        value={text}
      />
      <div className="mt-[clamp(11px,1.3cqw,14px)] h-px bg-border" />
      <div className="flex items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2">
          {confirmed ? null : (
            <Button
              className="h-[44px] min-h-11 px-0 text-muted-foreground hover:text-foreground"
              onClick={focusEditor}
              size="sm"
              type="button"
              variant="ghost"
            >
              <PencilIcon aria-hidden="true" className="size-[15px]" />
              <span className="text-[13px]">{focused ? "Editing" : "Edit"}</span>
            </Button>
          )}
          <Button
            className="h-[44px] min-h-11 px-0 text-muted-foreground hover:text-foreground"
            onClick={() => setOpenHistory(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <HistoryIcon aria-hidden="true" className="size-4" />
            <span className="text-[13px]">History</span>
          </Button>
        </div>
        <div className="flex items-center gap-2.5">
          <CharCounter text={text} xLimit={charLimit} />
          {confirmed ? (
            <a
              className="animate-in fade-in slide-in-from-bottom-1 duration-200 flex h-[30px] items-center gap-1.5 rounded-[2px] border border-primary/35 bg-primary/12 px-3 text-sm text-accent-foreground"
              href={draft.postedUrl ?? "#"}
              rel="noreferrer"
              target="_blank"
            >
              <CheckIcon aria-hidden="true" className="size-3.5" />
              Posted
            </a>
          ) : ambiguous ? (
            <span
              className="flex h-[30px] items-center gap-1.5 rounded-[2px] border border-warning/35 bg-warning/12 px-3 text-sm text-warning"
              title="Couldn't confirm this reached X — check your account, then edit to resend if it didn't post"
            >
              <svg
                aria-hidden="true"
                className="size-3.5"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 8v4" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
                <circle cx="12" cy="16" fill="currentColor" r="0.9" />
                <path
                  d="M5 22h14l-2-13H7L5 22z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M9 9h6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              Unconfirmed
            </span>
          ) : dirty ? (
            <Button
              className="h-[30px] rounded-[2px] px-[15px]"
              disabled={isPending || !text.trim()}
              onClick={handleSave}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          ) : (
            <PostToXControl
              charLimit={charLimit}
              draftId={draft.draftId}
              draftText={draft.text}
              xLinked={xLinked}
            />
          )}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DraftHistoryDialog
        canRevert={canRevert}
        onOpenChange={setOpenHistory}
        open={openHistory}
        winningDraftId={draft.draftId}
      />
    </section>
  );
}
