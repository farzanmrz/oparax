"use client";

import { Moon, Sun, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OparaxMark, XLogo } from "./brand";
import { brand, login, nav, signup } from "../content";
import type { DirectionProps } from "../types";

// Compact shared frame: content at 90% width up to 1800px, divider lines edge to edge (DESIGN.md Layout).
export const frame = "mx-auto w-[90%] max-w-[1800px] max-desk:w-[calc(100%-32px)]";

export function ProHeader({
  page,
  dark,
  onTheme,
  onLanding,
  onFeed,
  onSignup,
  onLogin,
  className,
}: Pick<DirectionProps, "page" | "dark" | "onLanding" | "onFeed" | "onSignup"> & {
  onTheme: () => void;
  onLogin: () => void;
  className?: string;
}) {
  const link = "rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground";
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md",
        className,
      )}
    >
      <div className={cn(frame, "flex h-15 items-center gap-8")}>
        <button
          type="button"
          onClick={onLanding}
          className="flex items-center gap-2 text-[22px] font-semibold tracking-tight"
          aria-label={`${brand.name} home`}
        >
          <OparaxMark className="size-7" />
          {brand.name}
        </button>
        <nav className="flex items-center gap-5 max-desk:hidden" aria-label="Primary">
          {page === "landing" ? (
            <>
              <a className={link} href="#product">
                {nav.product}
              </a>
              <a className={link} href="#roadmap">
                {nav.roadmap}
              </a>
              <a className={link} href="#pricing">
                {nav.pricing}
              </a>
            </>
          ) : null}
          <button
            type="button"
            onClick={onFeed}
            className={cn(link, page === "feed" && "text-foreground")}
            aria-current={page === "feed" ? "page" : undefined}
          >
            {nav.feed}
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon-lg" onClick={onTheme} aria-label={nav.theme} className="max-desk:size-11">
            {dark ? <Sun /> : <Moon />}
          </Button>
          <Button variant="ghost" onClick={onLogin} className="h-9 px-3 text-sm max-desk:hidden">
            {nav.logIn}
          </Button>
          <Button onClick={onSignup} className="h-9 px-4 text-sm max-desk:h-11">
            {nav.signUp}
          </Button>
        </div>
      </div>
    </header>
  );
}

export function ProFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className={cn(frame, "flex justify-end gap-6 py-5 text-sm text-muted-foreground max-desk:justify-start max-desk:pb-24")}>
        {nav.footer.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </footer>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

export function SignupDialog({
  open,
  onOpenChange,
  onFeed,
  mode = "signup",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeed: () => void;
  mode?: "signup" | "login";
}) {
  const copy = mode === "login" ? { ...signup, ...login } : signup;
  const go = () => {
    onOpenChange(false);
    onFeed();
  };
  const choice = "h-11 w-full justify-start gap-3 px-4 text-sm";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-7">
        <DialogHeader>
          <OparaxMark className="mb-3 size-9" />
          <DialogTitle className="text-xl font-semibold">{copy.title}</DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Button variant="outline" className={choice} onClick={go}>
            <XLogo />
            {signup.x}
          </Button>
          <Button variant="outline" className={choice} onClick={go}>
            <GoogleG />
            {signup.google}
          </Button>
          <Button variant="outline" className={choice} onClick={go}>
            <Mail />
            {signup.email}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
