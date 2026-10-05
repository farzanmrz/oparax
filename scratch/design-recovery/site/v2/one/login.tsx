"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Rss } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { AuthForm } from "@/v2/shared/auth-form";
import { lift, liftStyle, Stage } from "@/v2/deck/chrome";
import { sources, stories, type Source } from "@/v2/deck/data";
import { GitHubTile, SourceMark } from "@/v2/deck/marks";
import { BASE, StoryCard } from "./card";

// One log in and sign up: the React Bits Pro auth-4 block's composition (owner, Oct 4: "pick up an auth component
// from reactbits.dev, which has a login thingy with a side image of a circle or something"), drawn with the fixed
// theme: one framed panel split in two, the form on the left, and on the right the block's showcase of concentric
// rings holding the product's real objects (owner, Oct 4: "you could have put multiple different social media around
// it in the circle, right, or you could have put the card there"). In the centre one real story card; on the slowly
// turning dashed ring the four kinds of source, upright; on the outer still ring six real sources from the sample.
// The form is ours: email and password first, blue Log in, "New to Oparax? Sign up" swapping the confirm field in
// place, then neutral X and Google. A successful log in goes to setup, as sign up does.

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const input =
  "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[14px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] disabled:opacity-100";

const rings = ["size-40", "size-[280px]", "size-[400px]", "size-[520px]"];
const TURN = 90;

/** The Next.js 15 story from the sample feed (the @nextjs post and the vercel/next.js release), text first, with its
 * first two facts so the card sits inside the dashed ring and the four kind marks stay clear of it. */
const next15 = stories.clustered.find((s) => s.id === "st-next-15-gh")!;
const story = { ...next15, card: { ...next15.card, facts: next15.card.facts.slice(0, 2) } };

/** The four kinds of source, at 12, 3, 6 and 9 o'clock on the dashed ring. */
const kinds = [
  { id: "x", node: <XLogo className="size-[15px] text-t1" /> },
  { id: "rss", node: <Rss className="size-4 text-[var(--kind-article)]" aria-hidden="true" /> },
  { id: "github", node: <GitHubTile size={24} className="rounded-full" /> },
  { id: "web", node: <Globe className="size-4 text-[var(--kind-article)]" aria-hidden="true" /> },
];

/** Six real sources from the sample's chosen list, found by handle or host, clockwise from 12 o'clock. */
const bySource = (mark: string) => sources.find((s) => s.mark === mark)!;
const companies: Source[] = ["@nextjs", "vercel.com", "huggingface.co", "cursor.com", "mistral.ai", "simonwillison.net"].map(bySource);

/** A point on a circle of the given diameter, clockwise from 12 o'clock, as left and top offsets in pixels. */
const onRing = (diameter: number, i: number, n: number) => {
  const a = (i / n) * 2 * Math.PI;
  const r = diameter / 2;
  return { left: r + r * Math.sin(a), top: r - r * Math.cos(a) };
};

export function OneLogin({ initial = "login" }: { initial?: "login" | "signup" }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  return (
    <Stage light={760}>
      <header className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center px-4 pt-5 lg:px-8">
        <Link href={`${BASE}/landing`} className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-t1">
          <OparaxMark className="size-[22px]" />
          Oparax
        </Link>
        <ThemeToggle className="ml-auto size-8 text-t3" />
      </header>
      <main className="relative mx-auto flex w-full max-w-[1400px] flex-1 items-center px-4 py-8 lg:px-8">
        <div
          className={cn(lift, "grid w-full grid-cols-1 overflow-hidden lg:min-h-[680px] lg:grid-cols-2")}
          style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
        >
          <section
            className="flex flex-col justify-center px-8 py-10 lg:px-14"
            // The shared form sends a log in to the feed; here a valid log in goes to setup instead. Sign up and the
            // providers keep the shared form's own routes (setup).
            onSubmitCapture={(e) => {
              const form = e.target as HTMLFormElement;
              const data = new FormData(form);
              const confirm = form.querySelector<HTMLInputElement>('input[name="confirm"]');
              const signup = confirm ? !confirm.disabled : false;
              const mail = String(data.get("email") ?? "").trim();
              const pass = String(data.get("password") ?? "");
              if (signup || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) || pass.length < 6) return;
              e.preventDefault();
              e.stopPropagation();
              router.push(`${BASE}/setup`);
            }}
          >
            <div className="mx-auto w-full max-w-[380px]">
              <AuthForm
                base={BASE}
                initial={initial}
                fieldClass={input}
                labelClass="text-[13px] font-medium text-t2"
                titleClass="text-[26px] leading-none font-semibold tracking-[-0.025em] text-t1"
                radius="rounded-lg"
                linkClass="text-t1 underline-offset-4 hover:underline"
              />
            </div>
          </section>

          <motion.aside
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            aria-hidden="true"
            className="relative hidden items-center justify-center overflow-hidden border-l border-line bg-[var(--well)] lg:flex"
          >
            <div className="relative size-[520px] shrink-0">
              {rings.map((size) => (
                <div key={size} className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line", size)} />
              ))}
              <div className="absolute top-1/2 left-1/2 z-10 w-[240px] -translate-x-1/2 -translate-y-1/2">
                <StoryCard story={story} compact={false} />
              </div>
              <div className="absolute top-1/2 left-1/2 z-20 size-[400px] -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  animate={reduce ? undefined : { rotate: 360 }}
                  transition={{ duration: TURN, repeat: Infinity, ease: "linear" }}
                  className="relative size-full rounded-full border border-dashed border-line-strong"
                >
                  {kinds.map(({ id, node }, i) => (
                    <div key={id} className="absolute -translate-x-1/2 -translate-y-1/2" style={onRing(400, i, kinds.length)}>
                      <motion.span
                        animate={reduce ? undefined : { rotate: -360 }}
                        transition={{ duration: TURN, repeat: Infinity, ease: "linear" }}
                        className="grid size-9 place-items-center rounded-full border border-line-strong bg-[var(--window)]"
                        style={liftStyle}
                      >
                        {node}
                      </motion.span>
                    </div>
                  ))}
                </motion.div>
              </div>
              {companies.map((source, i) => (
                <div key={source.id} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={onRing(520, i, companies.length)}>
                  <span className={cn("block overflow-hidden", source.group === "x" ? "rounded-full" : "rounded-[10px]")} style={liftStyle}>
                    <SourceMark source={source} size={40} className={source.group === "x" ? "" : "rounded-[10px]"} />
                  </span>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </main>
    </Stage>
  );
}
