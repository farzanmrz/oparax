import Link from "next/link";
import { LandingCta } from "@/components/landing/landing-cta";
import { SignOutButton } from "@/components/landing/sign-out-button";
import { OparaxMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { landingContent } from "@/lib/landing/content";

export function LandingHeader({ signedIn }: { readonly signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-[1356px] items-center justify-between px-4">
        <Link
          href="/"
          className="flex h-11 items-center gap-2 text-[15px] font-medium tracking-[-0.01em] desk:h-auto"
        >
          <OparaxMark className="size-5" />
          {landingContent.brand}
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <SignOutButton />
          ) : (
            <>
              <LandingCta cta="log_in" placement="header" />
              <LandingCta cta="sign_up" placement="header" />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
