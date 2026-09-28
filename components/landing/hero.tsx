import { BuildBox } from "@/components/landing/build-box";
import { landingContent } from "@/lib/landing/content";

export function Hero({
  closed,
  error,
  handle,
  noAgent,
}: {
  closed?: boolean;
  error?: string;
  handle?: string;
  noAgent?: boolean;
}) {
  const copy = landingContent.hero;
  return (
    <section aria-labelledby="landing-title" className="space-y-6 py-12 desk:py-20">
      <h1
        id="landing-title"
        className="font-heading text-[42px] leading-tight text-balance font-normal tracking-[-0.02em] desk:text-[60px]"
      >
        {copy.headline}
      </h1>
      <p className="text-xl text-muted-foreground">{copy.description}</p>
      <p className="text-base">{copy.promise}</p>
      {noAgent ? <p role="status">{landingContent.box.noAgent}</p> : null}
      <BuildBox closed={closed} error={error} handle={handle} />
    </section>
  );
}
