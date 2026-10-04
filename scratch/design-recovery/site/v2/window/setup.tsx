"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtSign, FileText, ListChecks, MessageSquareText, Pin, ScanSearch } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { setup } from "@/next/copy";
import { AppFrame, BASE, Label, PrimaryButton, ShowProvider, TopBar } from "./chrome";
import { DAYS, HANDLE, posts, postsRead, profile, stories } from "./data";
import { Facts, StoryHead, StoryImage } from "./story";

// Window setup, v2: the X account and the one sentence (copy from next/copy.ts, the product's onboarding
// content). Beside the form, what the agent will read first: the person's public X profile and newest posts
// (the recorded example's values), and the kinds of source it will weigh against the sentence.

const steps = [
  { icon: AtSign, text: "Looks up your X account" },
  { icon: MessageSquareText, text: "Reads your newest posts" },
  { icon: ScanSearch, text: "Checks which X accounts, RSS feeds and websites fit your sentence" },
  { icon: ListChecks, text: "Chooses what to watch, with a reason for each" },
  { icon: FileText, text: "Writes your brief" },
];

const example = stories.clustered.find((s) => s.id === "clustered-mai")!;

const day = (iso: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));

export function Setup({ typed = false, blank = false }: { typed?: boolean; blank?: boolean }) {
  const router = useRouter();
  const [beat, setBeat] = useState("");
  const [missing, setMissing] = useState(blank);
  return (
    <ShowProvider>
    <div className="palette-council flex min-h-svh flex-col">
      <AppFrame
        bar={<TopBar badge={false} />}
        open={false}
        grid
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px]"
        heading={<h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">{setup.title}</h1>}
      >
              <form
                noValidate
                className="px-5 pt-8 pb-9 lg:px-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!beat.trim()) return setMissing(true);
                  router.push(`${BASE}/building`);
                }}
              >
                <div className="space-y-7">
                  {typed ? (
                    <Field className="gap-2">
                      <FieldLabel htmlFor="handle" className="text-[13.5px] font-medium text-t1">
                        {setup.handleLabel}
                      </FieldLabel>
                      <div className="flex h-11 items-center rounded-md border border-line-strong bg-[var(--well)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                        <span className="pl-3 text-[14px] text-t3">@</span>
                        <Input
                          id="handle"
                          name="handle"
                          placeholder={setup.handlePlaceholder}
                          autoComplete="off"
                          className="h-full border-0 bg-transparent pl-0.5 text-[14px] text-t1 shadow-none focus-visible:ring-0 md:text-[14px] dark:bg-transparent"
                        />
                      </div>
                      <FieldDescription className="text-[13px] text-t3">{setup.typedHelp}</FieldDescription>
                    </Field>
                  ) : (
                    <Field className="gap-2">
                      <FieldTitle className="text-[13.5px] font-medium text-t1">{setup.handleLabel}</FieldTitle>
                      <div className="flex h-11 items-center gap-2.5 rounded-md border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3">
                        <XLogo className="size-3.5 text-t1" />
                        <span className="text-[14px] font-semibold text-t1">@{HANDLE}</span>
                        <span className="ml-auto text-[12px] text-t2">From your sign-in</span>
                      </div>
                      <FieldDescription className="text-[13px] text-t3">{setup.verifiedHelp}</FieldDescription>
                    </Field>
                  )}
                  <Field className="gap-2">
                    <div className="flex items-baseline justify-between">
                      <FieldLabel htmlFor="beat" className="text-[13.5px] font-medium text-t1">
                        {setup.beatLabel}
                      </FieldLabel>
                      <span aria-live="polite" className="text-[12px] tabular-nums text-t3">
                        {beat.length}/{setup.beatMax}
                      </span>
                    </div>
                    <Textarea
                      id="beat"
                      name="beat"
                      value={beat}
                      maxLength={setup.beatMax}
                      onChange={(e) => {
                        setBeat(e.target.value);
                        if (e.target.value.trim()) setMissing(false);
                      }}
                      placeholder={setup.beatPlaceholder}
                      aria-invalid={missing || undefined}
                      aria-describedby={missing ? "beat-error" : undefined}
                      className="min-h-32 rounded-md border-line-strong bg-[var(--well)] px-3.5 py-3 text-[16px] leading-relaxed text-t1 placeholder:text-t3 md:text-[16px]"
                    />
                    {missing ? (
                      <FieldError id="beat-error" className="text-[13px]">
                        {setup.beatRequired}
                      </FieldError>
                    ) : null}
                  </Field>
                  <PrimaryButton type="submit" className="h-11 w-full text-[14px]">
                    {setup.submit}
                  </PrimaryButton>
                </div>
                <section aria-label="What happens next" className="mt-9 border-t border-line pt-6">
                  <Label>What happens next</Label>
                  <ol className="mt-3.5 grid grid-cols-1 gap-2">
                    {steps.map(({ icon: Icon, text }, i) => (
                      <li key={text} className="flex items-center gap-3 text-[13.5px] text-t2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-[var(--raised)] text-t2 shadow-[var(--top-light)]">
                          <Icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="w-4 text-[12px] tabular-nums text-t3">{i + 1}</span>
                        {text}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 text-[13px] text-t3">Your free week starts when your agent is ready and includes 300 watched X posts.</p>
                </section>
              </form>
              <aside aria-label="An example story and what your agent reads first" className="border-t border-line bg-[var(--rail)] px-5 pt-8 pb-8 lg:border-t-0 lg:border-l lg:px-7">
                <div className="flex items-center gap-2">
                  <Label>What a story looks like</Label>
                  <span className="ml-auto text-[12px] text-t3">Example from public sources</span>
                </div>
                <article className="mt-3.5 rounded-xl border border-line-strong bg-[var(--window)] p-4" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
                  <StoryImage src={example.image!} className="aspect-[2.2/1]" />
                  <div className="mt-3.5 [&_h2]:text-[17px]">
                    <StoryHead story={example} />
                  </div>
                  <Facts story={example} size="sm" className="mt-3" />
                </article>
                <Label className="mt-7">What your agent reads first</Label>
                <div className="mt-3.5 rounded-xl border border-line-strong bg-[var(--window)] p-4" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[17px] font-semibold text-white">
                      {profile.name[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] leading-tight font-semibold text-t1">{profile.name}</p>
                      <p className="text-[12.5px] text-t3">{profile.handle}</p>
                      <p className="mt-1.5 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>
                    </div>
                  </div>
                  <ul className="mt-4 divide-y divide-line border-t border-line">
                    {[{ ...profile.pinned, pinned: true, quoted: undefined }, ...posts.map((p) => ({ ...p, pinned: false }))].map((p) => (
                      <li key={p.id} className="flex gap-3 py-2.5">
                        <span className="w-12 shrink-0 pt-0.5 text-[11.5px] tabular-nums text-t3">{day(p.date)}</span>
                        <div className="min-w-0 flex-1">
                          {p.pinned ? (
                            <p className="flex items-center gap-1 text-[11.5px] text-t3">
                              <Pin className="size-3" aria-hidden="true" /> Pinned
                            </p>
                          ) : null}
                          <p className="text-[13px] leading-[1.5] text-t1">{p.text.replace(/\n+/g, " ")}</p>
                          {p.quoted ? (
                            <p className="mt-1.5 rounded-md border border-line bg-[var(--well)] px-2.5 py-1.5 text-[12px] leading-[1.45] text-t2">
                              <span className="font-medium text-[var(--kind-post)]">{p.quoted.author}</span> {p.quoted.text}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[12px] text-t3">
                    Up to {postsRead} newest posts from the last {DAYS} days and the pinned post. Reposts and replies are not read.
                  </p>
                </div>
              </aside>
      </AppFrame>
    </div>
    </ShowProvider>
  );
}
