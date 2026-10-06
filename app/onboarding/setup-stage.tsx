import { BrandRow, liftHigh, Stage } from "@/components/one/stage";
import { onboardingContent } from "@/lib/onboarding/content";
import { cn } from "@/lib/utils";

/** The One setup page: the title, then the form on its lifted card with the sample run beside it. */
export function SetupStage({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <Stage light={640}>
      <BrandRow />
      <main className="relative mx-auto w-full max-w-[1240px] px-4 pt-8 pb-16 desk:px-8">
        <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
          {onboardingContent.title}
        </h1>
        <p className="mt-2.5 text-[14px] text-t2">{onboardingContent.subtitle}</p>
        <div className="mt-6 grid items-start gap-8 desk:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
          <div className={cn(liftHigh, "p-6")}>{children}</div>
          {aside}
        </div>
      </main>
    </Stage>
  );
}
