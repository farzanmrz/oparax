"use client";

// Middle hero stage. The adapted magic-transform plays a few beats over the story's place, then
// unmounts and the clustered story it produced stays. The story is always in the DOM, so the
// stage keeps its size, screen readers read the story, and reduced motion shows it at once.
// The story is readable before scripts load and until the stage is on screen; the finite
// sequence starts only when a reader can actually see it.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { OparaxMark, SourceIcon, XLogo, sourceHost } from "../shared/brand";
import { evidence, stories } from "../content";
import MagicTransform, { type MagicTransformDocument } from "./blocks/magic-transform";
import { StoryCard } from "./story";
import { transform } from "./content";

const story = stories[0];
const [, articleSource, followupSource] = story.sources;
const BEATS = 3;

function Mentions({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@\w+)/g).map((part, index) =>
        part.startsWith("@") ? (
          <span key={index} className="text-primary">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

const documents: MagicTransformDocument[] = [
  {
    id: "post",
    labels: transform.labels.post,
    content: (
      <div className="flex h-full flex-col p-3">
        <div className="flex items-center gap-2">
          <img src={evidence.post.avatar} alt="" className="size-7 rounded-full" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-xs font-bold">{evidence.post.author}</p>
            <p className="text-[11px] text-muted-foreground">{evidence.post.handle}</p>
          </div>
          <XLogo className="size-3" />
        </div>
        <p className="mt-2.5 line-clamp-6 text-xs leading-snug">
          <Mentions text={evidence.post.excerpt} />
        </p>
      </div>
    ),
  },
  {
    id: "article",
    labels: transform.labels.article,
    content: (
      <div className="flex h-full flex-col">
        <img src={evidence.article.image} alt="" className="h-20 w-full object-cover" />
        <div className="p-3">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <SourceIcon source={articleSource} className="size-3.5" />
            <span className="font-semibold text-foreground">{articleSource.name}</span>
            {sourceHost(articleSource)}
          </p>
          <p className="mt-1.5 line-clamp-3 text-xs leading-snug font-semibold">{articleSource.title}</p>
        </div>
      </div>
    ),
  },
  {
    id: "followup",
    labels: transform.labels.followup,
    content: (
      <div className="flex h-full flex-col p-3">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <SourceIcon source={followupSource} className="size-3.5" />
          <span className="font-semibold text-foreground">{followupSource.name}</span>
        </p>
        <p className="mt-2 line-clamp-4 text-xs leading-snug font-semibold">{followupSource.title}</p>
        <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-muted-foreground">{followupSource.text}</p>
      </div>
    ),
  },
];

export function TransformStage({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"pending" | "run" | "done">("pending");

  // Phases only move forward, so the sequence plays at most once and always settles within 4.7s.
  useEffect(() => {
    if (reduced) return setPhase("done");
    if (!inView) return;
    setPhase((current) => (current === "pending" ? "run" : current));
    const cap = window.setTimeout(() => setPhase("done"), 4700);
    return () => window.clearTimeout(cap);
  }, [inView, reduced]);

  // Settle once every source has crossed, slightly before the 4.7s cap.
  const onBurst = (count: number) => {
    if (count >= BEATS) window.setTimeout(() => setPhase("done"), 900);
  };
  const showStory = phase !== "run";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        className={cn(
          "transition-[opacity,transform,filter] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
          showStory ? "opacity-100" : "scale-[0.97] opacity-0 blur-[3px]",
        )}
      >
        <StoryCard story={story} dense />
      </div>
      <AnimatePresence>
        {phase === "run" && (
          <motion.div
            key="transform"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <MagicTransform
                documents={documents}
                height="100%"
                documentDuration={1.4}
                documentWidth={168}
                documentHeight={224}
                centerContent={<OparaxMark className="size-7" />}
                axisLabel={transform.interest}
                onBurst={onBurst}
                className="h-full"
              />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
