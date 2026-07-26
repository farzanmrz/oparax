"use client";

// app/global-error.tsx
//
// The last-resort boundary: it replaces the ROOT layout, so it renders its own <html>/<body> and
// cannot rely on anything the app normally provides. Only reached when an error escapes every
// nested boundary — in practice a render failure in the root layout itself.
//
// Two jobs, in this order: report the error to Sentry (this is the only place a root-layout
// failure is ever recorded — by definition no in-app surface survived to show it), then give the
// reporter a way out that isn't the browser's back button.
//
// The wizard shipped Next's built-in `NextError` here, which renders an unstyled "Application
// error" page in the framework's voice rather than the product's. Markup is deliberately plain
// and stays readable even if the stylesheet never loads — a page that only appears when
// something is already badly wrong should not itself depend on much.

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8">
          <h1 className="font-semibold text-xl">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            The page couldn&apos;t load. The error has been reported — trying again often works.
          </p>
          {/* Not the shared Button: this boundary renders outside the root layout, so pulling app
              chrome in here risks the same failure taking the error page down with it. */}
          <div className="flex items-center gap-3">
            <button
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              onClick={reset}
              type="button"
            >
              Try again
            </button>
            <a className="text-muted-foreground text-sm underline" href="/agents">
              Back to your agents
            </a>
          </div>
          {/* Sentry groups by digest — showing it lets a reporter quote the exact event. */}
          {error.digest ? (
            <p className="font-mono text-muted-foreground text-xs">Reference: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
