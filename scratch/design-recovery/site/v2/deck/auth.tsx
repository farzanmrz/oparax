"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { auth } from "@/next/copy";
import { cn } from "@/lib/utils";
import { BASE } from "./chrome";

// Sign-up actions (copy from next/copy.ts, which quotes lib/auth/content.ts): X first, then Google, then email.

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4", className)}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.57.38-2.29V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.11C6.23 6.86 8.88 4.75 12 4.75Z" />
    </svg>
  );
}

const big = "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg text-[14px] font-medium transition-[filter,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function XButton({ className }: { className?: string }) {
  return (
    <Link
      href={`${BASE}/setup`}
      className={cn(
        big,
        "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] hover:brightness-110",
        className,
      )}
    >
      <XLogo className="size-3.5" />
      {auth.x}
    </Link>
  );
}

export function GoogleButton({ className }: { className?: string }) {
  return (
    <Link href={`${BASE}/setup?handle=typed`} className={cn(big, "border border-line-strong bg-[var(--window)] text-t1 hover:bg-raised", className)} style={{ boxShadow: "var(--top-light)" }}>
      <GoogleMark />
      {auth.google}
    </Link>
  );
}

export function EmailLink({ className }: { className?: string }) {
  return (
    <Link href={`${BASE}/signup`} className={cn("inline-flex items-center gap-1.5 text-[13px] text-t2 underline-offset-4 transition-colors hover:text-t1 hover:underline", className)}>
      <Mail className="size-3.5" aria-hidden="true" />
      Sign up with email and password
    </Link>
  );
}
