"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AuthForm } from "@/v2/shared/auth-form";
import { lift, Stage } from "@/v2/deck/chrome";
import { stories } from "@/v2/deck/data";
import { BASE, OneCard } from "./card";
import { column, OneHeader } from "./shell";

// One log in and sign up, outside the shell but on its header line (the mark and the theme). Deck's composition
// (deck-login.png): the neat independent lifted 420px form card at the left, email and password first, blue Log in,
// "New to Oparax? Sign up" swapping the confirm field in place, then neutral X and Google. At the right, Deck's fan
// of three real story cards at full size against the form's right edge, on the same lit stage: no scaling, no
// scrim, no caption. A valid log in goes to onboarding, as sign up does.

const input =
  "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[14px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] disabled:opacity-100";

export function OneLogin({ initial = "login" }: { initial?: "login" | "signup" }) {
  const router = useRouter();
  const [front, mid, back] = [stories.clustered[3], stories.clustered[0], stories.clustered[4]];
  return (
    <Stage light={760}>
      <OneHeader app={false} />
      <main className={cn(column, "relative grid flex-1 items-center gap-16 py-10 lg:grid-cols-[420px_minmax(0,1fr)]")}>
        <section
          className={cn(lift, "relative z-10 p-7")}
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

        {/* Deck's fan at full size: two compact cards tilted behind a readable front card. */}
        <div className="relative hidden h-[680px] lg:block" aria-label="Three stories from this week">
          <div className="absolute -top-6 left-[205px] w-[400px] rotate-[3deg]">
            <OneCard story={back} image="hero" imageHeight={150} compact />
          </div>
          <div className="absolute top-0 left-6 w-[400px] -rotate-[3.5deg]">
            <OneCard story={mid} image="hero" imageHeight={150} compact />
          </div>
          <div className="absolute top-24 left-[170px] w-[440px]">
            <OneCard story={front} image="hero" imageHeight={170} />
          </div>
        </div>
      </main>
    </Stage>
  );
}
