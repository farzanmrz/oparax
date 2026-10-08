"use client";

import { useActionState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { Spinner } from "@/components/ui/spinner";
import { type AuthFormState, signInWithProvider } from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

// Providers are neutral, never blue: white in light, the raised surface in dark. Only the main action is blue.
const provider =
  "inline-flex h-10 w-full items-center justify-start rounded-lg border border-line-strong bg-white text-[14px] font-medium text-[#14151a] transition-colors hover:bg-[#f3f4f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70 dark:bg-raised dark:text-t1 dark:hover:bg-[var(--tile-bg)]";

// Both buttons share one structure: the logo sits in a 20px slot 16px from the left edge, the label starts 12px after it.
const row = "flex items-center gap-3 pl-4";
const slot = "flex size-5 shrink-0 items-center justify-center";

// The standard multicolour Google G, the same in light and dark.
function GoogleG() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}

export function ProviderButtons({ next, mode }: { next?: string; mode: "login" | "signup" }) {
  const [xState, xAction, xPending] = useActionState<AuthFormState, FormData>(
    signInWithProvider.bind(null, "x", next),
    {},
  );
  const [googleState, googleAction, googlePending] = useActionState<AuthFormState, FormData>(
    signInWithProvider.bind(null, "google", next),
    {},
  );

  return (
    <div className="grid gap-2.5">
      <form action={xAction} className="grid gap-2" aria-busy={xPending}>
        <button type="submit" className={provider} disabled={xPending}>
          <span className={row}>
            <span className={slot}>
              {xPending ? <Spinner /> : <BrandIcon name="x" mono className="size-3.5" />}
            </span>
            <span>{mode === "login" ? authContent.loginX : authContent.x}</span>
          </span>
        </button>
        {xState.error && (
          <p role="alert" className="text-[13px] text-[var(--error)]">
            {xState.error}
          </p>
        )}
      </form>
      <form action={googleAction} className="grid gap-2" aria-busy={googlePending}>
        <button type="submit" className={provider} disabled={googlePending}>
          <span className={row}>
            <span className={slot}>{googlePending ? <Spinner /> : <GoogleG />}</span>
            <span>{mode === "login" ? authContent.loginGoogle : authContent.google}</span>
          </span>
        </button>
        {googleState.error && (
          <p role="alert" className="text-[13px] text-[var(--error)]">
            {googleState.error}
          </p>
        )}
      </form>
    </div>
  );
}
