import { LandingCta } from "@/components/landing/landing-cta";
import { OparaxMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { landingContent } from "@/lib/landing/content";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-[var(--header-bg)]">
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between px-4 desk:px-10">
        <span className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
          <OparaxMark className="size-5" />
          {landingContent.brand}
        </span>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <LandingCta cta="log_in" placement="header" />
          <LandingCta cta="sign_up" placement="header" />
        </nav>
      </div>
    </header>
  );
}
