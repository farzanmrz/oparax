"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/next/copy";
import { cn } from "@/lib/utils";
import { GoogleButton, XButton } from "./auth";
import { BASE, lift, SiteHeader, Stage } from "./chrome";
import { stories } from "./data";
import { StoryCard } from "./stack";

// Deck v2 sign-up: the sign-up card is the front card of the page, lifted like the feed's cards; beside it, the
// deck the person is signing up for, three of this week's real stories fanned as physical cards, front one fully
// readable. Copy is the product's (lib/auth/content.ts via next/copy.ts).

const input =
  "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[14px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)]";

export function DeckSignup() {
  const router = useRouter();
  const [front, mid, back] = [stories.clustered[3], stories.clustered[0], stories.clustered[4]];
  return (
    <Stage light={760}>
      <SiteHeader />
      <main className="relative mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-16 px-4 py-14 lg:grid-cols-[420px_minmax(0,1fr)] lg:px-8">
        <section className={cn(lift, "p-7")} style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
          <h1 className="text-[26px] leading-none font-semibold tracking-[-0.025em] text-t1">{auth.signup.title}</h1>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-t2">{auth.signup.subtitle}</p>
          <div className="mt-6 grid gap-2.5">
            <XButton />
            <GoogleButton />
          </div>
          <div className="my-5 flex items-center gap-3 text-[12px] text-t3">
            <span className="h-px flex-1 bg-line" />
            {auth.or}
            <span className="h-px flex-1 bg-line" />
          </div>
          <form
            method="post"
            className="grid gap-3.5"
            onSubmit={(e) => {
              // Preview: nothing is sent anywhere; go to the next step without putting the fields in the address.
              e.preventDefault();
              router.push(`${BASE}/setup?handle=typed`);
            }}
          >
            <label className="grid gap-1.5 text-[13px] font-medium text-t2">
              {auth.email}
              <input type="email" name="email" placeholder={auth.emailPlaceholder} autoComplete="email" className={input} />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-t2">
              {auth.password}
              <input type="password" name="password" autoComplete="new-password" className={input} />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-t2">
              {auth.confirm}
              <input type="password" name="confirm" autoComplete="new-password" className={input} />
            </label>
            <button
              type="submit"
              className="mt-1 h-10 rounded-lg border border-line-strong bg-raised text-[14px] font-medium text-t1 transition-colors hover:bg-[var(--brand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {auth.signup.submit}
            </button>
          </form>
          <p className="mt-5 text-center text-[13px] text-t3">
            {auth.signup.haveAccount}{" "}
            <Link href={`${BASE}/signup`} className="text-t1 underline-offset-4 hover:underline">
              Log In
            </Link>
          </p>
        </section>

        <div className="relative hidden h-[700px] lg:block" aria-label="Three stories from this week">
          <div className="absolute -top-6 left-[205px] w-[400px] rotate-[3deg]">
            <StoryCard story={back} imageHeight={150} compact />
          </div>
          <div className="absolute top-0 left-6 w-[400px] -rotate-[3.5deg]">
            <StoryCard story={mid} imageHeight={150} compact />
          </div>
          <div className="absolute top-24 left-[170px] w-[440px]">
            <StoryCard story={front} imageHeight={170} />
          </div>
          <p className="absolute bottom-0 left-[170px] text-[12px] text-t3">Stories from this week, from public sources. A preview, not your agent.</p>
        </div>
      </main>
    </Stage>
  );
}
