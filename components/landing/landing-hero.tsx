import Link from "next/link";
import { LandingCta } from "@/components/landing/landing-cta";
import { landingContent } from "@/lib/landing/content";

export function LandingHero({ signedIn }: { readonly signedIn: boolean }) {
  const { hero, account } = landingContent;
  return (
    <section className="bg-[radial-gradient(900px_360px_at_50%_0%,oklch(0.62_0.15_245/0.14),transparent_70%)] pt-16 pb-5 text-center">
      <div className="mx-auto max-w-[1356px] px-4">
        <h1 className="text-[42px] leading-[1.02] font-bold tracking-[-0.03em] text-balance desk:text-[60px]">
          {hero.headline}
        </h1>
        <p className="mx-auto mt-[18px] max-w-[36em] text-[19px] leading-normal text-pretty text-foreground">
          {hero.description}
        </p>
        {!signedIn && (
          <div className="mt-7 flex flex-col items-center justify-center gap-3 desk:flex-row">
            <LandingCta cta="sign_up" placement="hero" />
          </div>
        )}
        <p className="mx-auto mt-8 max-w-[36em] text-[15px] leading-normal text-pretty text-muted-foreground">
          {account.text}{" "}
          <Link href={account.href} className="underline underline-offset-4 hover:text-foreground">
            {account.link}
          </Link>
        </p>
      </div>
    </section>
  );
}
