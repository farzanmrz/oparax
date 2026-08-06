"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

// twitter-text 3.x is CommonJS — its ESM interop exposes only a default export (the
// twttr object), never a named `parseTweet`, so use the default and read parseTweet off it.
import twitterText from "twitter-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { publishDraftToX } from "@/lib/x/actions";

/**
 * X-composer-style budget ring: a tiny circular progress of chars used. Quiet by default;
 * turns warning past 90% and destructive when over, at which point the remaining count
 * appears beside it (negative when over) — the only time a number shows at all.
 */
function CharRing({ length, limit }: { length: number; limit: number }) {
  const ratio = Math.min(length / limit, 1);
  const over = length > limit;
  const near = !over && ratio > 0.9;
  const r = 8;
  const c = 2 * Math.PI * r;
  const remaining = limit - length;
  return (
    <span
      aria-label={`${length} of ${limit} characters used`}
      className="flex items-center gap-1.5"
      role="img"
    >
      <svg aria-hidden="true" className="-rotate-90" height="20" viewBox="0 0 20 20" width="20">
        <circle
          className="stroke-border"
          cx="10"
          cy="10"
          fill="none"
          r={r}
          strokeWidth="2"
        />
        <circle
          className={cn(
            over ? "stroke-destructive" : near ? "stroke-warning" : "stroke-primary",
          )}
          cx="10"
          cy="10"
          fill="none"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
      {over || near ? (
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums leading-none",
            over ? "text-destructive" : "text-warning",
          )}
        >
          {remaining}
        </span>
      ) : null}
    </span>
  );
}

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
      <Button asChild className="h-11 w-full rounded-none border-t" variant="outline">
        {/* Plain link, not a fetch: /auth/x is a full-page OAuth redirect to X.
            returnTo brings the reporter back to this exact desk page after linking. */}
        <a href={`/auth/x?returnTo=${encodeURIComponent(pathname)}`}>Connect X</a>
      </Button>
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
    <div className="flex w-full flex-col">
      {error ? (
        <p className="px-[clamp(15px,2.1cqw,22px)] pb-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {/* Footer row: budget ring on the left cell (X-composer placement), Post fills the rest. */}
      <div className="flex w-full items-stretch border-t">
        <span className="flex shrink-0 items-center px-[clamp(15px,2.1cqw,22px)]">
          <CharRing length={parsed.weightedLength} limit={charLimit} />
        </span>
        <Button
          className="h-11 flex-1 rounded-none border-l"
          disabled={isPending || !parsed.valid || overLimit}
          onClick={handleConfirm}
        >
          {isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}
