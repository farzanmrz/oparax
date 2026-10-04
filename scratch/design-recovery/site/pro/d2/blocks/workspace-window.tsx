"use client";

// Adapted from React Bits Pro app-shell-4 (https://pro.reactbits.dev/docs/app-ui/app-shell). Changes: kept the
// shell's region structure (tinted side region, bordered content region, tinted right panel, scroll-faded panes,
// 13px App UI density, theme accent and radius variables) and replaced every region's content: the newsroom nav
// becomes the Sources stage, the story queue table becomes the Oparax story, the schedule panel becomes Delivery
// with the shared XDm. Deleted the calendar, schedule data, filters, mobile drawer, panel toggle and matchMedia
// layout state; the 800px minimum height became a bounded 520px three-pane row from lg, stacked below it.
// Surfaces use the shared semantic tokens so the window matches the page in both themes.
import { ChevronRight, Inbox, Send } from "lucide-react";
import { OparaxMark } from "../../shared/brand";
import { ArticleCard, SourceList, XDm, XPost } from "../../shared/sources";
import { feed, hero, interest, stages, stories } from "../../content";
import { panes } from "../content";
import { ScrollFades, useScrollFade } from "./scroll-fade";

const story = stories[0];
const ease = [0.23, 1, 0.32, 1] as const;

// One finite arrival: reports land (0.1 to 1.0s), each is marked as joined, the story resolves, the DM arrives.
// Everything is in place by about 2.8s. CSS keyframes run before hydration and off the main thread; reduced
// motion removes them, so the final frame renders at once.
const arrival = `
@keyframes d2-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes d2-join { from { opacity: 0; transform: scaleY(0.3); } to { opacity: 1; transform: none; } }
.d2-rise { animation: d2-rise 450ms cubic-bezier(0.23, 1, 0.32, 1) both; }
.d2-join { animation: d2-join 350ms cubic-bezier(0.23, 1, 0.32, 1) both; }
@media (prefers-reduced-motion: reduce) { .d2-rise, .d2-join { animation: none; } }
`;

function beat(delay: number) {
  return { style: { animationDelay: `${delay}s` } };
}

function PaneHeader({
  icon,
  title,
  note,
  first = false,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  first?: boolean;
}) {
  return (
    <header className="relative flex shrink-0 gap-3 border-b border-border px-4 py-3.5 lg:h-[84px] lg:px-5">
      {!first && (
        <span
          aria-hidden="true"
          className="absolute -left-3 top-[26px] z-10 hidden size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground lg:grid"
        >
          <ChevronRight className="size-3.5" />
        </span>
      )}
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-[var(--rb-r-md)] bg-[var(--rb-accent)] text-[var(--rb-accent-fg)]"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-5 text-foreground">{title}</h2>
        <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">{note}</p>
      </div>
    </header>
  );
}

function ScrollPane({ children, from }: { children: React.ReactNode; from: string }) {
  const fade = useScrollFade<HTMLDivElement>();
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={fade.ref} onScroll={fade.onScroll} className="h-full lg:overflow-y-auto">
        {children}
      </div>
      <ScrollFades edges={fade.edges} from={from} />
    </div>
  );
}

// The joined mark: a short accent rule on the report's leading edge once Oparax has grouped it.
function Joined({ delay }: { delay: number }) {
  return (
    <>
      <span
        aria-hidden="true"
        style={{ animationDelay: `${delay}s` }}
        className="d2-join absolute inset-y-3 -left-px w-[3px] origin-center rounded-full bg-[var(--rb-accent)]"
      />
      <span className="sr-only">{panes.joined}</span>
    </>
  );
}

export default function WorkspaceWindow() {
  const [, release, update] = story.sources;

  return (
    <div
      role="group"
      aria-label={panes.windowLabel}
      className="rb-theme-scope relative overflow-hidden rounded-[var(--rb-r-4xl)] border border-border bg-card text-left text-card-foreground shadow-[0_1px_2px_rgb(9_15_29/0.06),0_24px_60px_-24px_rgb(9_15_29/0.35)] dark:shadow-[0_1px_0_rgb(255_255_255/0.04)_inset,0_30px_80px_-30px_rgb(0_0_0/0.8)]"
    >
      <style>{arrival}</style>
      <div className="flex h-11 items-center gap-2.5 border-b border-border bg-muted/50 px-4 text-[13px]">
        <OparaxMark className="size-[18px] text-foreground" />
        <span className="font-semibold text-foreground">{feed.agent}</span>
        <span className="ml-auto truncate text-muted-foreground max-desk:hidden">{hero.sample}</span>
      </div>

      <div className="flex flex-col lg:grid lg:h-[520px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.3fr)_minmax(0,0.92fr)]">
        <section aria-label={stages.sources.title} className="flex min-h-0 flex-col bg-muted/40">
          <PaneHeader first icon={<Inbox className="size-4" />} title={stages.sources.title} note={stages.sources.note} />
          <ScrollPane from="from-[color-mix(in_oklab,var(--card)_60%,var(--muted))]">
            <ol className="flex flex-col gap-2.5 p-4">
              <li {...beat(0.1)} className="d2-rise relative">
                <XPost compact className="rounded-[var(--rb-r-xl)] p-3.5 [&_p]:text-[13.5px]" />
                <Joined delay={1.25} />
              </li>
              {[release, update].map((source, index) => (
                <li key={source.url} {...beat(0.4 + index * 0.3)} className="d2-rise relative">
                  <ArticleCard source={source} className="rounded-[var(--rb-r-xl)]" />
                  <Joined delay={1.35 + index * 0.1} />
                </li>
              ))}
            </ol>
          </ScrollPane>
        </section>

        <section aria-label={stages.engine.title} className="flex min-h-0 flex-col border-border max-lg:border-t lg:border-l">
          <PaneHeader icon={<OparaxMark className="size-4" />} title={stages.engine.title} note={stages.engine.note} />
          <ScrollPane from="from-card">
            <p {...beat(1.1)} className="d2-rise mx-4 mt-4 inline-flex flex-wrap items-center gap-x-1.5 rounded-[var(--rb-r-md)] bg-accent px-2.5 py-1.5 text-[13px] text-accent-foreground lg:mx-5">
              <span className="text-muted-foreground">{interest.match}:</span>
              <span className="font-semibold">{interest.value}</span>
            </p>
            <article {...beat(1.45)} className="d2-rise px-4 pb-5 pt-3.5 lg:px-5">
              <h3 className="text-xl font-semibold leading-snug tracking-tight text-foreground">{story.title}</h3>
              <div className="mt-3 grid gap-4 desk:grid-cols-[minmax(0,1fr)_150px]">
                <ul className="flex flex-col gap-2.5 text-[13.5px] leading-relaxed text-foreground">
                  {story.facts.map((fact) => (
                    <li key={fact} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[var(--rb-accent)]" />
                      {fact}
                    </li>
                  ))}
                </ul>
                {story.image && (
                  <figure>
                    <img
                      src={story.image}
                      alt="Falcon Heavy carrying Europa Clipper lifts off from Kennedy Space Center"
                      className="h-[150px] w-full rounded-[var(--rb-r-lg)] object-cover max-desk:h-44"
                    />
                    <figcaption className="mt-1 text-[11px] text-muted-foreground">
                      {panes.photoCredit}: {story.imageCredit}
                    </figcaption>
                  </figure>
                )}
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground">{panes.storySources}</h4>
                <SourceList sources={story.sources} className="mt-2 [&_a]:min-h-6 [&_a]:text-[13px] [&_.font-medium]:whitespace-nowrap" />
              </div>
            </article>
          </ScrollPane>
        </section>

        <section aria-label={stages.delivery.title} className="flex min-h-0 flex-col border-border bg-muted/40 max-lg:border-t lg:border-l">
          <PaneHeader icon={<Send className="size-4" />} title={stages.delivery.title} note={stages.delivery.note} />
          <div {...beat(2.3)} className="d2-rise flex min-h-0 flex-1 flex-col p-4">
            <XDm className="h-full rounded-[var(--rb-r-xl)]" />
          </div>
        </section>
      </div>
    </div>
  );
}
