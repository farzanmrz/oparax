"use client";

import { useState } from "react";
import { XLogo } from "@/pro/shared/brand";

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const field =
  "h-11 w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--well)] px-3.5 text-[14px] text-t1 placeholder:text-t3 outline-none focus:border-[var(--brand)]";
const provider =
  "flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-[var(--line-strong)] bg-white text-[14px] font-medium text-[#1f2328] hover:bg-[#f3f4f6] dark:bg-[var(--raised)] dark:text-t1 dark:hover:bg-[var(--tile-bg)]";

export function AuthCard({ initial = "login" }: { initial?: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(initial);
  const signup = mode === "signup";
  return (
    <div
      className="w-full max-w-[400px] rounded-[18px] border border-line bg-[var(--window)] p-8"
      style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
    >
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-t1">{signup ? "Create your account" : "Log in to Oparax"}</h1>
      <p className="mt-1.5 text-[13.5px] text-t3">
        {signup ? "Your agent is ready a few minutes after you sign up." : "Welcome back."}
      </p>

      <form className="mt-6 grid gap-3" onSubmit={(e) => e.preventDefault()}>
        <input className={field} type="email" placeholder="Email" autoComplete="email" />
        <input className={field} type="password" placeholder="Password" autoComplete={signup ? "new-password" : "current-password"} />
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
          style={{ gridTemplateRows: signup ? "1fr" : "0fr", opacity: signup ? 1 : 0 }}
        >
          <div className="overflow-hidden">
            <input className={field} type="password" placeholder="Confirm password" autoComplete="new-password" tabIndex={signup ? 0 : -1} />
          </div>
        </div>
        {!signup && (
          <a href="#" className="-mt-1 justify-self-end text-[12.5px] text-[var(--brand)]">
            Forgot password?
          </a>
        )}
        <button
          type="submit"
          className="mt-1 h-11 rounded-[10px] bg-[var(--primary)] text-[14px] font-semibold text-white hover:opacity-90"
        >
          {signup ? "Sign up" : "Log in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[12px] text-t3">
        <span className="h-px flex-1 bg-[var(--line)]" />
        or
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <div className="grid gap-2.5">
        <button type="button" className={provider}>
          <XLogo className="size-4 text-black dark:text-white" />
          Continue with Twitter
        </button>
        <button type="button" className={provider}>
          <GoogleG />
          Continue with Google
        </button>
      </div>


      <p className="mt-6 text-center text-[13px] text-t3">
        {signup ? "Already have an account? " : "New to Oparax? "}
        <button type="button" onClick={() => setMode(signup ? "login" : "signup")} className="font-medium text-[var(--brand)]">
          {signup ? "Log in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
