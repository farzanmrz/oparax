"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Layers, Newspaper } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { AuthForm } from "@/v2/shared/auth-form";
import { lift, Stage } from "@/v2/deck/chrome";
import { BASE } from "./card";

// One log in and sign up: the React Bits Pro auth-4 block's composition (owner, Oct 4: "pick up an auth component
// from reactbits.dev, which has a login thingy with a side image of a circle or something"), drawn with the fixed
// theme: one framed panel split in two, the form on the left, and on the right the block's showcase: concentric
// rings, a slowly turning dashed ring, the Oparax mark in the centre and three floating chips. The form is ours:
// email and password first, blue Log in, "New to Oparax? Sign up" swapping the confirm field in place, then neutral
// X and Google. A successful log in goes to setup, as sign up does.

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const input =
  "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[14px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] disabled:opacity-100";

const rings = ["size-40", "size-[280px]", "size-[400px]", "size-[520px]"];

const chips = [
  { label: "One story per event", icon: Layers, position: "left-1/2 top-[calc(50%-140px)]" },
  { label: "Sources you chose", icon: Newspaper, position: "left-[calc(50%+142px)] top-[calc(50%+44px)]" },
  { label: "Alerts on X", icon: Bell, position: "left-[calc(50%-124px)] top-[calc(50%+112px)]" },
];

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
              <div className="absolute top-1/2 left-1/2 size-[340px] -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  animate={reduce ? undefined : { rotate: 360 }}
                  transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                  className="size-full rounded-full border border-dashed border-line-strong"
                />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span
                  className="grid size-14 place-items-center rounded-2xl bg-[var(--brand)] text-white"
                  style={{ boxShadow: "0 0 0 1px rgb(36 89 232 / 0.6), 0 10px 30px -8px rgb(58 108 244 / 0.7)" }}
                >
                  <OparaxMark className="size-7" />
                </span>
              </div>
              {chips.map(({ label, icon: Icon, position }, index) => (
                <div key={label} className={cn("absolute -translate-x-1/2 -translate-y-1/2", position)}>
                  <motion.span
                    animate={reduce ? undefined : { y: [0, -5, 0] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: index * 1.4 }}
                    className={cn(lift, "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium whitespace-nowrap text-t2")}
                  >
                    <Icon className="size-3.5 text-t3" aria-hidden="true" />
                    {label}
                  </motion.span>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </main>
    </Stage>
  );
}
