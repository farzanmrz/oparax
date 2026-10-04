import { Quote } from "lucide-react";
import { SourceMark } from "@/components/one/marks";
import { lift } from "@/components/one/stage";
import { onboardingContent as copy } from "@/lib/onboarding/content";
import { setupSample as sample } from "@/lib/onboarding/sample";
import { cn } from "@/lib/utils";

// The right column of setup: the recorded sample run, marked "Sample" so it never reads as this person's agent.
export function SetupSample() {
  return (
    <section aria-labelledby="setup-sample">
      <p id="setup-sample" className="flex items-center gap-2 text-[12.5px] text-t3">
        <span className="rounded-full border border-line-strong bg-raised px-2 py-0.5 text-[11.5px] font-medium text-t2">
          {copy.sampleLabel}
        </span>
        {copy.sampleTitle}
      </p>
      <div className={cn(lift, "mt-3 overflow-hidden")}>
        <div className="p-5">
          <div className="flex gap-2.5 rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3.5 py-3">
            <Quote className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <p className="text-[15px] leading-snug font-medium text-t1">{sample.beat}</p>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {sample.interests.map((topic) => (
              <li
                key={topic}
                className="rounded-full border border-line bg-well px-2.5 py-0.5 text-[12px] text-t2"
              >
                {topic}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-4 desk:grid-cols-3">
            {sample.groups.map((group) => (
              <div key={group.label}>
                <p className="flex items-center font-mono text-[10.5px] tracking-[0.12em] text-t3 uppercase">
                  {group.label}
                  <span className="ml-auto tracking-normal tabular-nums">
                    {group.sources.length}
                  </span>
                </p>
                <ul className="mt-2 grid gap-1">
                  {group.sources.map((source) => (
                    <li key={source.name} className="flex items-center gap-2 text-[12.5px] text-t2">
                      <SourceMark kind={source.kind} mark={source.mark} size={18} />
                      <span className="truncate">{source.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <ul className="grid border-t border-line desk:grid-cols-3">
          {sample.stories.map((story, i) => (
            <li
              key={story.headline}
              className={cn("min-w-0", i > 0 && "desk:border-l desk:border-line")}
            >
              {/* biome-ignore lint/performance/noImgElement: Publisher images use the browser with no referrer. */}
              <img
                src={story.image}
                alt=""
                width={1200}
                height={500}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="aspect-[2.4/1] max-h-[220px] w-full object-cover"
              />
              <div className="p-3.5">
                <p className="text-[11.5px] text-t3 tabular-nums">{story.time}</p>
                <p className="mt-1 text-[13.5px] leading-snug font-semibold text-t1">
                  {story.headline}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
