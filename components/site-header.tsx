import Link from "next/link";
import { LandingCta } from "@/components/landing/landing-cta";
import { SignOutButton } from "@/components/landing/sign-out-button";
import { OparaxMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { landingContent } from "@/lib/landing/content";

export function SiteHeader({ signedIn }: { readonly signedIn: boolean }) {
  const sections = landingContent.navigation.sections;
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-14 w-[min(90%,1800px)] items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-[15px] font-medium tracking-[-0.01em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <OparaxMark className="size-5" />
            {landingContent.brand}
          </Link>
          <nav
            aria-label={landingContent.navigation.sectionsLabel}
            className="hidden desk:flex desk:items-center desk:gap-5"
          >
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="inline-flex min-h-8 items-center rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {section.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1 desk:gap-2">
          <ThemeToggle />
          {signedIn ? (
            <SignOutButton />
          ) : (
            <>
              <LandingCta cta="log_in" placement="header" />
              <LandingCta cta="sign_up" placement="header" />
            </>
          )}
        </div>
      </div>
      <nav
        aria-label={landingContent.navigation.sectionsLabel}
        className="mx-auto flex w-[min(90%,1800px)] items-center justify-center gap-6 border-t border-border/70 desk:hidden"
      >
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {section.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
