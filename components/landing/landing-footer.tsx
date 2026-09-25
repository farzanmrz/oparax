import { OparaxMark } from "@/components/logo";
import { landingContent } from "@/lib/landing/content";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex min-h-14 max-w-[1356px] flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13.5px] text-muted-foreground">
        <span className="flex items-center gap-2 font-semibold tracking-[-0.01em]">
          <OparaxMark className="size-5" />
          {landingContent.brand}
        </span>
        <span>{landingContent.footer}</span>
      </div>
    </footer>
  );
}
