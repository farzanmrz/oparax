"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { draftStory } from "./draft-actions";

const GENERIC = "Couldn't write a draft this time. Press Draft to try again.";

export function DraftButton({
  draftId,
  onDrafted,
}: {
  draftId: string;
  onDrafted: (draftId: string, text: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDraft() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await draftStory(draftId);
        if (result.ok) {
          onDrafted(result.draftId, result.text);
          router.refresh();
          return;
        }
        setError(result.error);
        if (
          result.error === "This story is already being drafted." ||
          result.error === "This story already has a draft."
        ) {
          router.refresh();
        }
      } catch {
        setError(GENERIC);
      }
    });
  }

  return (
    <>
      <div className="hidden px-6 pb-[19px] desk:block">
        <div className="mt-[14px] flex justify-end">
          <Button
            className={isPending ? "h-[var(--post-h-web)] bg-primary/50" : "h-[var(--post-h-web)]"}
            disabled={isPending}
            onClick={handleDraft}
            type="button"
          >
            {isPending ? "Drafting…" : "Draft"}
          </Button>
        </div>
        {error ? (
          <p className="mt-2.5 text-right text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {isPending ? (
        <section className="animate-[op-skeleton_1.5s_ease-in-out_infinite] space-y-3 rounded-b-lg border-t border-[var(--draft-border-top)] bg-draft-bg px-[14px] py-4 desk:px-6">
          <div className="h-4 w-11/12 rounded-md bg-white/10" />
          <div className="h-4 w-3/4 rounded-md bg-white/10" />
          <div className="h-4 w-2/5 rounded-md bg-white/10" />
        </section>
      ) : null}
      <div className="desk:hidden">
        <Button
          className={`h-[var(--post-h-mobile)] w-full rounded-t-none rounded-b-[9px] ${isPending ? "bg-primary/50" : ""}`}
          disabled={isPending}
          onClick={handleDraft}
          type="button"
        >
          {isPending ? "Drafting…" : "Draft"}
        </Button>
        {error ? (
          <p className="px-[14px] pt-2.5 pb-3.5 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}
