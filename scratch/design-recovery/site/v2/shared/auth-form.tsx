"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { XLogo } from "@/pro/shared/brand";
import { auth } from "@/next/copy";
import { cn } from "@/lib/utils";

// One log in and sign up form for the three v2 styles. Each style's login.tsx puts it inside that style's own
// sign-up composition and passes that style's field, label and radius classes, so the form is adapted per style.
// "Sign up" switches the same form in place: a confirm field slides open and the copy changes, no page change.

export function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Height and opacity slide: the content stays mounted so it can animate, and is inert while closed. */
function Slide({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function AuthForm({
  base,
  initial = "login",
  titleClass = "text-[26px] leading-tight font-semibold tracking-[-0.025em] text-t1",
  labelClass = "text-[13px] font-medium text-t2",
  fieldClass,
  radius = "rounded-md",
  linkClass = "text-[var(--brand)] hover:underline",
}: {
  base: string;
  initial?: "login" | "signup";
  titleClass?: string;
  labelClass?: string;
  fieldClass: string;
  radius?: string;
  linkClass?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initial);
  const [error, setError] = useState<string | null>(null);
  const signup = mode === "signup";
  const flip = (next: "login" | "signup") => {
    setMode(next);
    setError(null);
  };
  const btn = cn("inline-flex h-10 w-full items-center justify-center gap-2.5 text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", radius);
  // Providers are neutral, never blue: white in light, the raised dark surface in dark. Only the main button is blue.
  const provider = cn(
    btn,
    "border border-[var(--line-strong)] bg-white text-[#14151a] hover:bg-[#f3f4f6] dark:bg-[var(--raised)] dark:text-[var(--t1)] dark:hover:bg-[var(--tile-bg)]",
  );
  const primary = cn(
    btn,
    "bg-[var(--primary)] text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_4px_14px_-4px_rgb(58_108_244/0.55)] hover:brightness-110",
  );

  return (
    <div>
      <h1 className={titleClass}>{signup ? "Create your account" : "Log in to Oparax"}</h1>
      <form
        className="mt-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const mail = String(data.get("email") ?? "").trim();
          const pass = String(data.get("password") ?? "");
          const confirm = String(data.get("confirm") ?? "");
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return setError("Please enter a valid email address.");
          if (pass.length < 6) return setError("Password must be at least 6 characters.");
          if (signup && pass !== confirm) return setError("Passwords do not match.");
          setError(null);
          router.push(signup ? `${base}/setup?handle=typed` : `${base}/feed`);
        }}
      >
        <div className="grid gap-3.5">
          <label className="grid gap-1.5">
            <span className={labelClass}>{auth.email}</span>
            <input name="email" type="email" autoComplete="email" placeholder={auth.emailPlaceholder} className={fieldClass} onChange={() => setError(null)} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelClass}>{auth.password}</span>
            <input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} className={fieldClass} onChange={() => setError(null)} />
          </label>
        </div>
        <Slide open={signup}>
          <label className="mt-3.5 grid gap-1.5">
            <span className={labelClass}>{auth.confirm}</span>
            <input name="confirm" type="password" autoComplete="new-password" disabled={!signup} className={fieldClass} onChange={() => setError(null)} />
          </label>
        </Slide>
        <Slide open={!signup}>
          <div className="pt-2.5 text-right">
            <a href="#" onClick={(e) => e.preventDefault()} className={cn("text-[13px]", linkClass)}>
              {auth.login.forgot}
            </a>
          </div>
        </Slide>
        {error ? (
          <p role="alert" className="mt-3 text-[13px] text-[var(--error)]">
            {error}
          </p>
        ) : null}
        <button type="submit" className={cn(primary, "mt-5")}>
          {signup ? auth.signup.submit : auth.login.submit}
        </button>
        <p className="mt-3 text-center text-[13px] text-t3">
          {signup ? `${auth.signup.haveAccount} ` : "New to Oparax? "}
          <button type="button" onClick={() => flip(signup ? "login" : "signup")} className={cn("font-medium", linkClass)}>
            {signup ? "Log in" : "Sign up"}
          </button>
        </p>
      </form>

      <div className="my-5 flex items-center gap-3 text-[12px] text-t3">
        <span className="h-px flex-1 bg-line" />
        {auth.or}
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-2.5">
        <button type="button" className={provider} onClick={() => router.push(`${base}/setup`)}>
          <XLogo className="size-3.5 text-black dark:text-white" />
          {auth.x}
        </button>
        <button type="button" className={provider} onClick={() => router.push(`${base}/setup?handle=typed`)}>
          <GoogleG />
          {auth.google}
        </button>
      </div>
    </div>
  );
}
