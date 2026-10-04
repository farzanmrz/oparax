"use client";

import Link from "next/link";
import { useState } from "react";
import { XLogo } from "@/pro/shared/brand";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { auth } from "@/next/copy";
import { cn } from "@/lib/utils";
import { BASE, Label, PrimaryButton, SecondaryButton, ShowProvider, SiteHeader, Stage, Window } from "./chrome";
import { PREVIEW_NOTE, stories } from "./data";
import { GoogleMark } from "./landing";
import { Dot } from "./marks";
import { Facts, SourceCard, sortedItems, StoryHead, StoryImage } from "./story";

// Window sign up, v2. One lifted window: the form on the left (X, Google, or email and password, copy from
// lib/auth/content.ts), and on the right the kind of story the person is signing up for, readable in full.

const olmo = stories.clustered.find((s) => s.id === "clustered-olmo")!;
const mistral = stories.clustered.find((s) => s.id === "clustered-mistral")!;

export function Signup({ sent = false }: { sent?: boolean }) {
  const [error, setError] = useState<{ field: "email" | "password" | "confirm"; text: string } | null>(null);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(sent);
  const input = "h-10 rounded-md border-line-strong bg-[var(--well)] px-3 text-[14px] md:text-[14px] text-t1 placeholder:text-t3";
  return (
    <ShowProvider>
      <div className="palette-council flex min-h-svh flex-col">
        <SiteHeader active="signup" />
        <main className="flex-1">
          <Stage grid className="min-h-[calc(100svh-57px)] rounded-none border-0 p-4 lg:p-5">
            <div>
              <Window className="grid grid-cols-1 lg:grid-cols-[440px_minmax(0,1fr)]">
                <div className="border-b border-line px-5 pt-8 pb-10 lg:border-r lg:border-b-0 lg:px-8">
                  <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">{auth.signup.title}</h1>
                  <p className="mt-3 text-[14px] leading-[1.55] text-t2">{auth.signup.subtitle}</p>
                  {done ? (
                    <div role="status" className="mt-8 rounded-lg border border-[var(--ok)]/40 bg-[var(--ok-soft)] px-4 py-3.5 text-[13.5px] leading-[1.55] text-t1">
                      <p className="flex items-center gap-2 font-medium text-[var(--ok)]">
                        <Dot tone="ok" /> Check your email
                      </p>
                      <p className="mt-1.5 text-t2">{auth.sent(email || "you@newsroom.com")}</p>
                    </div>
                  ) : (
                    <form
                      className="mt-8"
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        const mail = String(data.get("email") ?? "").trim();
                        const pass = String(data.get("password") ?? "");
                        const confirm = String(data.get("confirm") ?? "");
                        // Messages from lib/auth/content.ts.
                        if (!mail) return setError({ field: "email", text: "Email is required." });
                        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return setError({ field: "email", text: "Please enter a valid email address." });
                        if (!pass) return setError({ field: "password", text: "Password is required." });
                        if (pass.length < 6) return setError({ field: "password", text: "Password must be at least 6 characters." });
                        if (!confirm) return setError({ field: "confirm", text: "Please confirm your password." });
                        if (pass !== confirm) return setError({ field: "confirm", text: "Passwords do not match." });
                        setDone(true);
                      }}
                    >
                      <FieldGroup className="gap-4">
                        <Field className="gap-2.5">
                          <PrimaryButton href={`${BASE}/setup`} className="h-10 w-full">
                            <XLogo className="size-3.5" />
                            {auth.x}
                          </PrimaryButton>
                          <SecondaryButton href={`${BASE}/setup?handle=typed`} className="h-10 w-full">
                            <GoogleMark />
                            {auth.google}
                          </SecondaryButton>
                        </Field>
                        <FieldSeparator className="my-1 text-[12px] *:data-[slot=field-separator-content]:bg-[var(--window)] *:data-[slot=field-separator-content]:text-t3">
                          {auth.or}
                        </FieldSeparator>
                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="email" className="text-[13px] text-t2">
                            {auth.email}
                          </FieldLabel>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            aria-invalid={error?.field === "email" || undefined}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setError(null);
                            }}
                            placeholder={auth.emailPlaceholder}
                            className={input}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field className="gap-1.5">
                            <FieldLabel htmlFor="password" className="text-[13px] text-t2">
                              {auth.password}
                            </FieldLabel>
                            <Input id="password" name="password" type="password" aria-invalid={error?.field === "password" || undefined} className={input} onChange={() => setError(null)} />
                          </Field>
                          <Field className="gap-1.5">
                            <FieldLabel htmlFor="confirm" className="text-[13px] text-t2">
                              {auth.confirm}
                            </FieldLabel>
                            <Input id="confirm" name="confirm" type="password" aria-invalid={error?.field === "confirm" || undefined} className={input} onChange={() => setError(null)} />
                          </Field>
                        </div>
                        {error ? (
                          <FieldError role="alert" className="text-[13px]">
                            {error.text}
                          </FieldError>
                        ) : null}
                        <PrimaryButton type="submit" className="mt-1 h-10 w-full">
                          {auth.signup.submit}
                        </PrimaryButton>
                        <p className="text-center text-[13px] text-t3">
                          {auth.signup.haveAccount}{" "}
                          <Link href={`${BASE}/signup`} className="font-medium text-[var(--brand)] hover:underline">
                            Log in
                          </Link>
                        </p>
                      </FieldGroup>
                    </form>
                  )}
                  <div className="mt-8 border-t border-line pt-5">
                    <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--caution)]">
                      <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide">FREE WEEK</span>
                      7 days, 300 watched X posts, no card
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-t3">It starts when your agent is ready.</p>
                  </div>
                </div>
                <div className="min-w-0 bg-[var(--rail)] px-5 pt-8 pb-8 lg:px-8">
                  <div className="flex items-center gap-2">
                    <Label>What you sign up for</Label>
                    <span className="ml-auto text-[12px] text-t3">{PREVIEW_NOTE}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                    {[olmo, mistral].map((s) => (
                      <article
                        key={s.id}
                        className="min-w-0 rounded-xl border border-line-strong bg-[var(--window)] p-4"
                        style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
                      >
                        <StoryImage src={s.image!} />
                        <div className="mt-3.5 [&_h2]:text-[17px]">
                          <StoryHead story={s} />
                        </div>
                        <Facts story={s} size="sm" className="mt-3" />
                        <div className={cn("mt-3.5")}>
                          {sortedItems(s).map((item) => (
                            <SourceCard key={item.id} item={item} story={s} />
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </Window>
            </div>
          </Stage>
        </main>
      </div>
    </ShowProvider>
  );
}
