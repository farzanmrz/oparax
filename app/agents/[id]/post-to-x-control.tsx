"use client";

import { usePathname, useRouter } from "next/navigation";
import { type JSX, type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";

// twitter-text 3.x is CommonJS — its ESM interop exposes only a default export (the
// twttr object), never a named `parseTweet`, so use the default and read parseTweet off it.
import twitterText from "twitter-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { publishDraftToX } from "@/lib/x/actions";

export function PostToXControl({
  draftId,
  draftText,
  charLimit,
  disabled = false,
  onPendingChange,
  xLinked,
  mobileMetadata,
}: {
  draftId: string;
  draftText: string;
  /** The desk's X ceiling — 280, or 25,000 when its reporter or posting-account tier is premium
   *  (resolved by `resolveDeskTier` in page.tsx). */
  charLimit: number;
  disabled?: boolean;
  onPendingChange: (pending: boolean) => void;
  xLinked: boolean;
  mobileMetadata?: ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!xLinked) {
    return (
      <div className="relative">
        <Button
          asChild
          className="h-[var(--post-h-mobile)] w-full rounded-t-none rounded-b-[9px] desk:h-[var(--post-h-web)] desk:w-auto desk:rounded-md"
          variant="outline"
        >
          {/* Plain link, not a fetch: /auth/x is a full-page OAuth redirect to X.
              returnTo brings the reporter back to this exact desk page after linking. */}
          <a href={`/auth/x?returnTo=${encodeURIComponent(pathname)}`}>Connect X</a>
        </Button>
        {mobileMetadata}
      </div>
    );
  }

  // Mirror `checkXPostable`'s config (desk-config.ts): plain `parseTweet` validates against
  // X's DEFAULT 280 ceiling regardless of tier, so a premium desk's 280–25,000-char draft
  // was client-disabled here even though the server gate would post it fine.
  type ParseTweetOptions = NonNullable<Parameters<typeof twitterText.parseTweet>[1]>;
  const twitterTextWithConfigs = twitterText as typeof twitterText & {
    configs: { version3: ParseTweetOptions };
  };
  const parsed = twitterText.parseTweet(draftText, {
    ...twitterTextWithConfigs.configs.version3,
    maxWeightedTweetLength: charLimit,
  });
  const overLimit = parsed.weightedLength > charLimit;

  const handleConfirm = () => {
    setError(null);
    onPendingChange(true);
    startTransition(async () => {
      try {
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
      } finally {
        onPendingChange(false);
      }
    });
  };

  return (
    <div className="flex w-full flex-col desk:w-auto">
      {error ? (
        <p className="px-[14px] pb-2 text-sm text-destructive desk:px-0" role="alert">
          {error}
        </p>
      ) : null}
      <div className="relative">
        <Button
          className={cn(
            "h-[var(--post-h-mobile)] w-full rounded-t-none rounded-b-[9px] px-4 desk:h-[var(--post-h-web)] desk:w-auto desk:rounded-md",
            isPending && "bg-primary/50",
          )}
          disabled={disabled || isPending || !parsed.valid || overLimit}
          onClick={handleConfirm}
        >
          {isPending ? "Posting…" : "Post"}
        </Button>
        {mobileMetadata}
      </div>
    </div>
  );
}
