// app/feed/[handle]/layout.tsx
//
// Minimal chrome for the PUBLIC feed page, deliberately not the app shell. A thin top bar
// carries the mark and wordmark home, the main column follows the design tokens, and the
// footer is one quiet measurement disclosure. All copy on this surface is sentence case.

import Link from "next/link";
import { OparaxMark } from "@/components/logo";

export default function PublicFeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-[var(--band-border)] bg-[var(--header-bg)]">
        <div className="mx-auto flex h-12 w-full max-w-[var(--content-max)] items-center px-[var(--gutter-mobile)] desk:px-[var(--gutter-web)]">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-md text-text-title outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <OparaxMark className="size-5" />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Oparax</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-[var(--gutter-mobile)] py-[var(--page-rhythm-mobile)] desk:px-[var(--gutter-web)] desk:py-[var(--page-rhythm-web)]">
        {children}
      </main>
      <footer className="border-t border-[var(--band-border)]">
        <div className="mx-auto w-full max-w-[var(--content-max)] px-[var(--gutter-mobile)] py-4 desk:px-[var(--gutter-web)]">
          <p className="text-[12.5px] text-text-muted">
            This public page is measured. Views, searches, and clicks are counted to improve the
            product.
          </p>
        </div>
      </footer>
    </div>
  );
}
