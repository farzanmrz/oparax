"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { Check, Globe, Loader2, Mail, MessageCircle, Send } from "lucide-react";
type Channel = {
  name: string;
  handle: string;
  photo: string;
  icon: LucideIcon;
  status: string;
};
const sideChannels: [Channel, Channel] = [
  {
    name: "Nova Blog",
    handle: "nova.app/blog",
    photo: "https://i.pravatar.cc/80?img=32",
    icon: Globe,
    status: "Ready",
  },
  {
    name: "Newsletter",
    handle: "1,204 subscribers",
    photo: "https://i.pravatar.cc/80?img=26",
    icon: Mail,
    status: "Ready",
  },
];
const ease = [0.22, 1, 0.36, 1] as const;
const sidePlacement = {
  left: "[translate:calc(-50%_-_140px)_-50%] @sm:[translate:calc(-50%_-_176px)_-50%] @2xl:[translate:calc(-50%_-_230px)_-50%] group-hover:[translate:calc(-50%_-_156px)_-50%] @sm:group-hover:[translate:calc(-50%_-_192px)_-50%] @2xl:group-hover:[translate:calc(-50%_-_250px)_-50%]",
  right:
    "[translate:calc(-50%_+_140px)_-50%] @sm:[translate:calc(-50%_+_176px)_-50%] @2xl:[translate:calc(-50%_+_230px)_-50%] group-hover:[translate:calc(-50%_+_156px)_-50%] @sm:group-hover:[translate:calc(-50%_+_192px)_-50%] @2xl:group-hover:[translate:calc(-50%_+_250px)_-50%]",
};
function SideCard({
  channel,
  side,
  reduce,
  status,
}: {
  channel: Channel;
  side: "left" | "right";
  reduce: boolean;
  status: "idle" | "publishing" | "published";
}) {
  const Icon = channel.icon;
  const dir = side === "left" ? -1 : 1;
  return (
    <motion.div
      initial={{ opacity: 0, rotate: 0 }}
      whileInView={{ opacity: 1, rotate: reduce ? 0 : dir * 6 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: 0.15, ease }}
      className={`absolute left-1/2 top-1/2 w-[196px] cursor-default rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] transition-[translate] duration-500 ease-out dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none ${sidePlacement[side]}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <img
            src={channel.photo}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-semibold text-neutral-900 dark:text-white">
            {channel.name}
          </p>
          <p className="truncate text-[10px] text-neutral-500">
            {channel.handle}
          </p>
        </div>
        <Icon className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
      </div>
      <div className="mt-3.5 space-y-1.5">
        <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-1.5 w-[86%] rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-1.5 w-[62%] rounded-full bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        {status === "published" ? (
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
        )}
        {status === "publishing"
          ? "Publishing…"
          : status === "published"
            ? "Published"
            : channel.status}
      </div>
    </motion.div>
  );
}
export default function Bento7() {
  const reduce = !!useReducedMotion();
  const [status, setStatus] = useState<"idle" | "publishing" | "published">(
    "idle",
  );
  useEffect(() => {
    if (status !== "publishing") return;
    const timer = window.setTimeout(() => setStatus("published"), 1100);
    return () => window.clearTimeout(timer);
  }, [status]);
  const publish = () => setStatus(reduce ? "published" : "publishing");
  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="@container relative min-h-[220px] flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[210px] w-full max-w-[620px] @2xl:scale-110">
            <SideCard
              channel={sideChannels[0]}
              side="left"
              reduce={reduce}
              status={status}
            />
            <SideCard
              channel={sideChannels[1]}
              side="right"
              reduce={reduce}
              status={status}
            />

            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease }}
              className="absolute left-1/2 top-1/2 z-10 w-[220px] -translate-x-1/2 -translate-y-1/2"
            >
              <motion.div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_20px_48px_-16px_rgba(0,0,0,0.2)] dark:border-neutral-700 dark:bg-neutral-950 dark:shadow-[0_20px_48px_-16px_rgba(0,0,0,0.6)]">
                <div className="flex items-center gap-2.5">
                  <span className="block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-neutral-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-neutral-950">
                    <img
                      src="https://i.pravatar.cc/80?img=45"
                      alt="Maya Kowalski"
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-xs font-semibold text-neutral-900 dark:text-white">
                      Maya Kowalski
                    </p>
                    <p className="truncate text-[10px] text-neutral-500">
                      @mayabuilds
                    </p>
                  </div>
                  <MessageCircle className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  Shipped the new editor today. Faster on every page, and it
                  finally remembers where you left off.
                </p>
                <div className="mt-3.5 flex items-center justify-between">
                  <span className="text-[10px] tabular-nums text-neutral-400 dark:text-neutral-500">
                    3 channels
                  </span>
                  <button
                    type="button"
                    onClick={publish}
                    disabled={status === "publishing"}
                    aria-label={
                      status === "published"
                        ? "Publish again to all channels"
                        : undefined
                    }
                    className="inline-flex cursor-pointer disabled:cursor-wait items-center gap-1.5 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-white transition-colors duration-200 hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    {status === "publishing" ? (
                      <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
                    ) : status === "published" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    <span aria-live="polite">
                      {status === "publishing"
                        ? "Publishing"
                        : status === "published"
                          ? "Published"
                          : "Publish"}
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
          Publish everywhere at once
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Write once and send it to your blog, your newsletter and your socials,
          each formatted the way that channel expects.
        </p>
      </div>
    </article>
  );
}
