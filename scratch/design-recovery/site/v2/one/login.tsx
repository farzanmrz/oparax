"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { AuthForm } from "@/v2/shared/auth-form";
import { lift, Stage } from "@/v2/deck/chrome";
import { stories } from "@/v2/deck/data";
import { BASE, OneCard } from "./card";

// One log in and sign up: the Deck login's two columns. The form on the lifted window surface (email and password
// first, blue Log in, "New to Oparax? Sign up" swapping the confirm field in place, then neutral X and Google), and
// the story cards fanned beside it under a light page-colored scrim, no blur, so the form stands clear of them.
// A successful log in goes to setup, as sign up does.

const input =
  "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[14px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] disabled:opacity-100";

export function OneLogin({ initial = "login" }: { initial?: "login" | "signup" }) {
  const router = useRouter();
  const [front, mid, back] = [stories.clustered[3], stories.clustered[0], stories.clustered[4]];
  return (
    <Stage light={760}>
      <header className="relative z-10 flex items-center px-2 pt-4 lg:px-4">
        <Link href={`${BASE}/landing`} className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-t1">
          <OparaxMark className="size-[22px]" />
          Oparax
        </Link>
        <ThemeToggle className="ml-auto size-8 text-t3" />
      </header>
      <main className="relative grid flex-1 items-center justify-center gap-16 px-2 py-10 lg:grid-cols-[420px_640px] lg:px-4">
        <section
          className={cn(lift, "relative z-10 p-7")}
          style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
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

        {/* The fan drawn at 60 percent (front card 264px, the two behind 240px), centred beside the form, under a
            stronger page scrim so the form is the only full-size lifted surface. */}
        <div className="relative hidden h-[408px] w-[384px] -translate-y-6 justify-self-center lg:block" aria-label="Three stories from this week">
          <div className="absolute top-0 left-0 h-[680px] w-[640px] origin-top-left scale-[0.6]">
            <div className="absolute -top-4 left-[205px] w-[400px] rotate-[3deg]">
              <OneCard story={back} image="hero" imageHeight={150} compact />
            </div>
            <div className="absolute top-2 left-6 w-[400px] -rotate-[3.5deg]">
              <OneCard story={mid} image="hero" imageHeight={150} compact />
            </div>
            <div className="absolute top-24 left-[170px] w-[440px]">
              <OneCard story={front} image="hero" imageHeight={170} />
            </div>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-16 z-20 bg-[var(--page)] opacity-60"
            style={{ maskImage: "radial-gradient(closest-side, black 72%, transparent)", WebkitMaskImage: "radial-gradient(closest-side, black 72%, transparent)" }}
          />
          <p className="absolute top-full left-[102px] z-30 mt-3 w-max text-[12px] text-t3">Stories from this week, from public sources. A preview, not your agent.</p>
        </div>
      </main>
    </Stage>
  );
}
