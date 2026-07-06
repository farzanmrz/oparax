import Link from "next/link";
import { OparaxMark } from "@/components/logo";

/**
 * Shared chrome for the auth screens: centered branded card with the mark,
 * a heading, optional subheading, and a footer row for cross-links.
 * Presentation only — pages pass their existing forms/alerts as children.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <OparaxMark className="size-5" />
            Oparax
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/** Inline alert styles for auth error / notice messages. */
export function AuthAlert({
  tone,
  children,
}: {
  tone: "error" | "notice";
  children: React.ReactNode;
}) {
  if (tone === "error") {
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive"
      >
        {children}
      </p>
    );
  }
  return (
    <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
      {children}
    </p>
  );
}
