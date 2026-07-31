// app/agents/[id]/draft-edit-dialog.tsx
//
// Draft edit-in-place: a Dialog + trigger icon-button, structurally mirroring
// `draft-history-dialog.tsx` (own trigger, own open state) but NOT its content or its
// URL-synced open state — an edit isn't a shareable/deep-linkable view the way history/
// council are, so this dialog's open state is plain local `useState`. Card/dialog idiom per
// the plan text, not chat primitives.
"use client";

import { PencilIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { editDraft } from "./actions";

export function DraftEditDialog({
  draftId,
  currentText,
  disabled,
}: {
  draftId: string;
  currentText: string;
  /** True once this draft is confirmed-posted to X — both `posted_at` AND `posted_url` set
   *  (see `draft-platform-switcher.tsx`'s `confirmed` check). editDraft itself rejects this
   *  server-side too (a fresh version would carry no posted_at, re-offering Post to X on the
   *  edited text), this is just the earlier, clearer signal. A draft in the ambiguous state
   *  (`posted_at` set but `posted_url` null — X accepted the post but the outcome stamp
   *  failed) deliberately stays editable: editing it IS its recovery path. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(currentText);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Re-sync to the current winning text every time the dialog opens — a stale value from
      // a previous open (before this desk's data revalidated) would otherwise silently ship.
      setText(currentText);
      setError(null);
    }
  }

  function handleSave() {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setError("Draft text can't be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await editDraft(draftId, trimmed);
      if (result.ok) {
        setOpen(false);
        toast.success("Draft updated");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog onOpenChange={disabled ? undefined : handleOpenChange} open={open && !disabled}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button aria-label="Edit draft" disabled={disabled} size="icon-sm" variant="ghost">
                <PencilIcon aria-hidden="true" className="size-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {disabled ? "Already posted to X — can't be edited" : "Edit draft"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Edit draft</DialogTitle>
          <DialogDescription>
            Your edit is saved as a new version — the draft's history keeps every version that came
            before it.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          className="min-h-[160px]"
          onChange={(event) => setText(event.target.value)}
          value={text}
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isPending} variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <Button disabled={isPending} onClick={handleSave}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
