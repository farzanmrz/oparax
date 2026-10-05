"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { AuthForm } from "@/v2/shared/auth-form";
import { lift, Stage } from "@/v2/deck/chrome";
import { stories } from "@/v2/deck/data";
import { GitHubTile, SiteIcon } from "@/v2/deck/marks";
import { BASE, StoryCard } from "./card";
import CenterFlow from "./center-flow";
import { column, OneHeader } from "./shell";

// One log in and sign up, outside the shell but on its header line (the mark and the theme). Deck's composition
// (deck-login.png): the neat independent lifted 420px form card at the left, email and password first, blue Log in,
// "New to Oparax? Sign up" swapping the confirm field in place, then neutral X and Google. At the right, React Bits
// Center Flow (center-flow.tsx): the "Next.js 15 is released as stable" story is the centre, and five kinds of
// source flow into it, clockwise from the top: GitHub, Product Hunt, the web, RSS and X. A valid log in goes to
// onboarding, as sign up does.

const input =
  "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[14px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] disabled:opacity-100";

/** The Next.js 15 story from the sample feed (the @nextjs post and the vercel/next.js release), with two facts. */
const next15 = stories.clustered.find((s) => s.id === "st-next-15-gh")!;
const story = { ...next15, card: { ...next15.card, facts: next15.card.facts.slice(0, 2) } };

/** Our tokens as 6-digit hex (Center Flow appends hex alpha to its colours). --line is white 7.5 percent on the
 * dark --page #0b0c0f and ink rgb(16 24 40) 10 percent on the light --page #eceef2; --brand is #6b95ff dark and
 * #2459e8 light (app/(next)/palettes.css, .palette-council). */
const tokens = {
  dark: { line: "#1d1e21", brand: "#6b95ff" },
  light: { line: "#d6d9de", brand: "#2459e8" },
};

/** The five nodes, clockwise from the top. */
const nodes = [
  { content: <GitHubTile size={30} className="rounded-[7px]" /> },
  { content: <SiteIcon host="producthunt.com" size={28} className="rounded-[7px]" /> },
  { content: <Globe className="size-6 text-[var(--kind-article)]" strokeWidth={1.75} aria-hidden="true" /> },
  { content: <Rss className="size-6 text-[var(--kind-article)]" strokeWidth={2} aria-hidden="true" /> },
  { content: <XLogo className="size-5 text-t1" /> },
];

function useLight() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setLight(!el.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return light;
}

const CENTER_W = 320;
const CARD_W = CENTER_W - 4;

export function OneLogin({ initial = "login" }: { initial?: "login" | "signup" }) {
  const router = useRouter();
  const light = useLight();
  const c = light ? tokens.light : tokens.dark;
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(236);
  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const measure = () => setCardH(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Stage light={760}>
      <OneHeader app={false} />
      <main className={cn(column, "relative grid flex-1 items-center gap-16 py-10 lg:grid-cols-[420px_minmax(0,1fr)]")}>
        <section
          className={cn(lift, "p-7")}
          style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
          // The shared form sends a log in to the feed; here a valid log in goes to onboarding instead.
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
            router.push(`${BASE}/onboarding`);
          }}
        >
          <AuthForm
            base={BASE}
            initial={initial}
            fieldClass={input}
            labelClass="text-[13px] font-medium text-t2"
            titleClass="text-[26px] leading-none font-semibold tracking-[-0.025em] text-t1"
            radius="rounded-lg"
            linkClass="text-t1 underline-offset-4 hover:underline"
          />
        </section>

        <div className="hidden justify-center lg:flex" aria-label="Sources flowing into one story">
          <div className="h-[560px] w-[620px] shrink-0">
            <CenterFlow
              isLight={light}
              nodeItems={nodes}
              nodeSize={56}
              nodeDistance={0.78}
              centerSize={CENTER_W}
              centerHeight={cardH + 4}
              centerBackground="transparent"
              borderRadius={12}
              lineColor={c.line}
              lineColorLight={c.line}
              pulseColor={c.brand}
              pulseColorLight={c.brand}
              glowColor={c.brand}
              glowColorLight={c.brand}
              maxGlowIntensity={12}
              centerContent={
                <div ref={card} className="shrink-0" style={{ width: CARD_W }}>
                  <StoryCard story={story} />
                </div>
              }
            />
          </div>
        </div>
      </main>
    </Stage>
  );
}
