"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { XLogo } from "@/pro/shared/brand";
import { auth } from "@/next/copy";
import { cn } from "@/lib/utils";

// One log in and sign up form for the v2 styles, matching the product's accepted card (components/auth/one-card.tsx,
// lib/auth/content.ts, October 8): "Log in to Oparax", Email then Password, "Forgot password?", the main button
// "Login", "New to Oparax? Sign up" flipping the card to sign up in place, then "or" and the two provider buttons in
// layout C (an 18px logo and the label centred together as one group, 10px apart). Each style's login.tsx puts it inside that style's own
// sign-up composition and passes that style's field, label and radius classes, so the form is adapted per style.
// "Sign up" switches the same form in place: a confirm field slides open and the copy changes, no page change.

/** The standard multicolour Google G, the same in light and dark (the product's provider-buttons.tsx). */
export function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
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
  // Both provider buttons share one structure: the logo in an 18px slot and the label, one group centred, 10px apart.
  const row = "flex items-center gap-2.5";
  const slot = "flex size-[18px] shrink-0 items-center justify-center";
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
          {signup ? "Sign up" : "Login"}
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
          <span className={row}>
            <span className={slot}>
              <XLogo className="size-[18px] text-black dark:text-white" />
            </span>
            <span>{signup ? "Continue with Twitter" : "Login with Twitter"}</span>
          </span>
        </button>
        <button type="button" className={provider} onClick={() => router.push(`${base}/setup?handle=typed`)}>
          <span className={row}>
            <span className={slot}>
              <GoogleG />
            </span>
            <span>{signup ? "Continue with Google" : "Login with Google"}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
