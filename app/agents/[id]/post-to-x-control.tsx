"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

// twitter-text 3.x is CommonJS — its ESM interop exposes only a default export (the
// twttr object), never a named `parseTweet`, so use the default and read parseTweet off it.
import twitterText from "twitter-text";
import { Button } from "@/components/ui/button";
import { publishDraftToX } from "@/lib/x/actions";

export function PostToXControl({
  draftId,
  draftText,
  charLimit,
  xLinked,
}: {
  draftId: string;
  draftText: string;
  /** The desk's X ceiling — 280, or 25,000 when the posting account's stored `x_accounts.tier`
   *  is premium (resolved by `resolveXTier` in page.tsx). */
  charLimit: number;
  xLinked: boolean;
}): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!xLinked) {
    return (
      <Button asChild className="h-[30px] rounded-[2px] px-[15px]" size="sm" variant="outline">
        {/* Plain link, not a fetch: /auth/x is a full-page OAuth redirect to X.
            returnTo brings the reporter back to this exact desk page after linking. */}
        <a href={`/auth/x?returnTo=${encodeURIComponent(pathname)}`}>Connect X</a>
      </Button>
    );
  }

  const parsed = twitterText.parseTweet(draftText);
  const overLimit = parsed.weightedLength > charLimit;

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await publishDraftToX(draftId);
      if (result.ok) {
        router.refresh();
        toast.success("Posted to X", {
          action: {
            label: "View post",
            onClick: () => window.open(result.url, "_blank", "noopener,noreferrer"),
          },
        });
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        className="h-[30px] rounded-[2px] px-[15px]"
        disabled={isPending || !parsed.valid || overLimit}
        onClick={handleConfirm}
      >
        {isPending ? "Posting…" : "Post"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
