"use client";

import { ArrowRight, BadgeCheck, Check, ChevronRight } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { auth, setup, building } from "@/next/copy";
import { PREVIEW_NOTE } from "@/next/data/feed";
import { Head, KindBadge, kindMeta, PrimaryButton, SourceLogo } from "./atoms";
import { beat, buildLog, funnel, HANDLE, sourceRows } from "./data";

// Screen 5: the way in, as the real screens. Sign-up first, then the X account and one sentence, then the
// recorded build run with its stored log times, ending in the sources the agent starts watching.

const t0 = Date.parse(buildLog[0].at);
const secs = (at: string) => `+${((Date.parse(at) - t0) / 1000).toFixed(1)}s`;
const steps = buildLog.filter((l, i, a) => i === 0 || l.message !== a[i - 1].message);
const total = Math.round((Date.parse(buildLog[buildLog.length - 1].at) - t0) / 1000);

export function Start() {
  const kinds = (["rss", "website", "x"] as const).map((k) => ({ k, n: sourceRows.filter((r) => r.kind === k).length }));
  return (
    <section id="start" className="stage flex h-[900px] flex-col border-t border-line pt-[88px]">
      <div className="mx-auto w-full max-w-[1360px] px-8">
        <Head
          title={`Sign up, write one sentence, ready in ${total} seconds`}
          line="Oparax reads your recent X posts once, picks at most ten websites and feeds plus the X accounts worth watching, and builds your page."
        />
        <div className="mt-7 grid grid-cols-[340px_24px_1fr_24px_420px] items-start">
          <div className="tile p-5">
            <p className="text-[17px] font-semibold text-t1">{auth.signup.title}</p>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-t3">{auth.signup.subtitle}</p>
            <div className="mt-4 space-y-2">
              <span className="flex h-9 items-center justify-center gap-2 rounded-md bg-black text-[13px] font-medium text-white ring-1 ring-white/10">
                <XLogo className="size-3" /> {auth.x}
              </span>
              <span className="flex h-9 items-center justify-center gap-2 rounded-md border border-line-strong bg-[var(--window)] text-[13px] font-medium text-t1">
                <GoogleG /> {auth.google}
              </span>
            </div>
            <div className="my-3.5 flex items-center gap-3 text-[11.5px] text-t4">
              <span className="h-px flex-1 bg-line" />
              {auth.or}
              <span className="h-px flex-1 bg-line" />
            </div>
            <Field label={auth.email} value={auth.emailPlaceholder} muted />
            <Field label={auth.password} value="" muted className="mt-2.5" />
            <PrimaryButton className="mt-4 h-9 w-full">{auth.signup.submit}</PrimaryButton>
          </div>

          <Connector />

          <div className="lift p-6">
            <p className="text-[19px] font-semibold text-t1">{setup.title}</p>
            <label className="mt-4 block text-[12.5px] font-medium text-t2">{setup.handleLabel}</label>
            <div className="mt-1.5 flex h-10 items-center gap-2 rounded-md border border-line-strong bg-[var(--well)] px-3">
              <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>
              <span className="text-[13.5px] text-t1">@{HANDLE}</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[var(--ok-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ok)]">
                <BadgeCheck className="size-3" /> from your sign-in
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] text-t3">{setup.verifiedHelp}</p>
            <label className="mt-4 block text-[12.5px] font-medium text-t2">{setup.beatLabel}</label>
            <div className="mt-1.5 rounded-md border border-[var(--brand-line)] bg-[var(--well)] px-3 py-2.5 shadow-[0_0_0_3px_var(--brand-soft)]">
              <p className="text-[14px] leading-[1.5] text-t1">
                {beat}
                <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-[var(--brand)]" />
              </p>
              <p className="mt-2 text-right font-mono text-[10.5px] text-t4">
                {beat.length}/{setup.beatMax}
              </p>
            </div>
            <PrimaryButton className="mt-5 h-10 w-full text-[13.5px]">
              {setup.submit} <ArrowRight className="size-3.5" />
            </PrimaryButton>
          </div>

          <Connector />

          <div className="tile overflow-hidden">
            <div className="flex h-11 items-center justify-between border-b border-line px-4">
              <span className="text-[13.5px] font-semibold text-t1">{building.title}</span>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--ok)]">
                <span className="size-1.5 rounded-full bg-[var(--ok)]" /> Ready
              </span>
            </div>
            <ol className="px-4 py-2">
              {steps.map((s) => (
                <li key={s.at} className="flex items-start gap-3 py-[6px]">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)]">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-[12.5px] leading-[1.45] text-t2">{s.message}</span>
                  <span className="shrink-0 font-mono text-[10.5px] text-t4">{secs(s.at)}</span>
                </li>
              ))}
            </ol>
            <div className="border-t border-line bg-[var(--rail)] px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {kinds.map(({ k, n }) => (
                  <KindBadge key={k} kind={k} count={n} plural={n !== 1} />
                ))}
              </div>
              <a className="mt-3 flex items-center justify-between rounded-md border border-line bg-[var(--window)] px-3 py-2 text-[12.5px]">
                <span className="font-mono text-t1">oparax.ai/{HANDLE}</span>
                <span className="flex items-center gap-1 text-[var(--brand)]">
                  Open your page <ChevronRight className="size-3.5" />
                </span>
              </a>
              <p className="mt-2 text-[11.5px] text-t3">
                {`Day zero: each of the ${funnel.chosen} sources' 10 newest items from the last 2 days.`}
              </p>
            </div>
          </div>
        </div>

        <div className="tile mt-5 flex items-start gap-4 px-4 py-3.5">
          <span className="mt-1 shrink-0 text-[12.5px] font-medium text-t1">Starts watching</span>
          <div className="flex flex-wrap gap-1.5">
            {sourceRows
              .filter((r) => r.kind !== "github")
              .map((r) => (
                <span
                  key={r.id}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-[var(--window)] pl-1.5 pr-2.5 text-[12px] text-t2"
                  style={{ boxShadow: `inset 0 -2px 0 ${kindMeta[r.kind].color}` }}
                >
                  <SourceLogo kind={r.kind} host={r.host} handle={r.handle} size={15} />
                  {r.kind === "x" ? r.handle : r.name}
                </span>
              ))}
          </div>
        </div>
      </div>

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-6 px-8 text-[12.5px] text-t3">
          <span className="flex items-center gap-2 font-semibold text-t1">
            <OparaxMark className="size-4" /> Oparax
          </span>
          <span className="text-t4">{PREVIEW_NOTE}</span>
          <span className="ml-auto flex gap-5">
            <a>Privacy</a>
            <a>Terms</a>
            <a>Contact</a>
          </span>
        </div>
      </footer>
    </section>
  );
}

function Connector() {
  return (
    <span className="mt-[140px] flex items-center justify-center text-t4" aria-hidden="true">
      <ChevronRight className="size-4" />
    </span>
  );
}

function Field({ label, value, muted, className }: { label: string; value: string; muted?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[12px] font-medium text-t2">{label}</p>
      <div className="mt-1 flex h-9 items-center rounded-md border border-line-strong bg-[var(--well)] px-3 text-[13px]">
        <span className={muted ? "text-t4" : "text-t1"}>{value}</span>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-3.5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
