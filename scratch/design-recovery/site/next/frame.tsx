import Link from "next/link";
import { OparaxMark } from "@/pro/shared/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme";

// DESIGN.md layout: content at 90% width up to 1800px; header and footer rules run edge to edge.
export const frame = "mx-auto w-[90%] max-w-[1800px]";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/next/landing"
      className={cn("flex items-center gap-2 text-lg font-semibold tracking-tight", className)}
      aria-label="Oparax home"
    >
      <OparaxMark className="size-6" />
      Oparax
    </Link>
  );
}

const navLink = "text-sm text-muted-foreground transition-colors hover:text-foreground";

/** visitor: landing and auth pages. member: signed-in pages (setup, building, feed, plans). */
export function SiteHeader({ variant }: { variant: "landing" | "visitor" | "member" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className={cn(frame, "flex h-14 items-center gap-8")}>
        <Logo />
        {variant === "landing" ? (
          <nav className="flex items-center gap-6" aria-label="Primary">
            <a className={navLink} href="#how-it-works">
              How It Works
            </a>
            <a className={navLink} href="#roadmap">
              Roadmap
            </a>
            <a className={navLink} href="#pricing">
              Pricing
            </a>
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {variant === "member" ? (
            <>
              <Button variant="ghost" className="h-9 px-3 text-sm">
                Settings
              </Button>
              <Button variant="ghost" className="h-9 px-3 text-sm">
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="h-9 px-3 text-sm">
                <Link href="/next/login">Log In</Link>
              </Button>
              <Button asChild className="h-9 px-4 text-sm">
                <Link href="/next/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("mt-auto border-t border-border", className)}>
      <div className={cn(frame, "flex h-12 items-center justify-end gap-6 text-sm text-muted-foreground")}>
        {["Privacy", "Terms", "Contact"].map((label) => (
          <a key={label} href="#" className="transition-colors hover:text-foreground">
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}

export function Page({
  header,
  children,
  className,
}: {
  header: "landing" | "visitor" | "member";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader variant={header} />
      <main className={cn("flex-1", className)}>{children}</main>
      <SiteFooter />
    </div>
  );
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function readParams(searchParams: SearchParams) {
  const sp = await searchParams;
  return (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };
}
