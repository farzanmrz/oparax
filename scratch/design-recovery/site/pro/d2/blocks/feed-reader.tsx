"use client";

// Adapted from React Bits Pro app-shell-5 (https://pro.reactbits.dev/docs/app-ui/app-shell). Changes: kept the
// list/detail split, listbox keyboard model (arrows, Home, End, Enter), search with its empty state, the phone
// behavior that swaps list and detail with a back button, scroll fades and focus handling. Removed the mailbox
// rail and drawer, unread dots and read tracking, Unread/Assigned/Escalated filters, reply, star, archive,
// delete, the overflow menu and confirm dialog, sender email and attachment. Conversations became Oparax feed
// entries grouped under one date header each; the reading pane shows title, facts, photo when present and the
// sources once. Neutral classes became semantic tokens; lg/xl breakpoints became desk.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { SourceIcon, sourceHost } from "../../shared/brand";
import { directItems, evidence, feed, stories, type Source } from "../../content";
import type { FeedMode } from "../../types";
import { feedCopy } from "../content";
import { cx, focusInset, focusRing, ScrollFades, useScrollFade } from "./scroll-fade";

type Entry = {
  id: string;
  date: string;
  title: string;
  facts: string[];
  sources: Source[];
  image?: string;
  imageAlt?: string;
  credit?: string;
};

const entries: Record<FeedMode, Entry[]> = {
  clustered: [...stories]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .map((story) => ({
      id: story.id,
      date: story.date,
      title: story.title,
      facts: story.facts,
      sources: story.sources,
      image: story.image,
      imageAlt: evidence.article.imageAlt,
      credit: story.imageCredit,
    })),
  direct: directItems.map((item, index) => ({
    id: `direct-${index}`,
    date: item.date,
    title: item.headline,
    facts: item.facts,
    sources: [item.source],
    image: item.image,
    imageAlt: item.imageAlt,
    credit: item.credit,
  })),
};

function groupByDate(list: Entry[]) {
  const groups: { date: string; items: Entry[] }[] = [];
  for (const entry of list) {
    const last = groups.at(-1);
    if (last?.date === entry.date) last.items.push(entry);
    else groups.push({ date: entry.date, items: [entry] });
  }
  return groups;
}

function SourceRows({ sources, facts }: { sources: Source[]; facts: string[] }) {
  return (
    <ul className="divide-y divide-border rounded-[var(--rb-r-xl)] border border-border">
      {sources.map((source) => (
        <li key={source.url} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
          <SourceIcon source={source} className="mt-0.5 size-5" />
          <div className="min-w-0 flex-1 max-desk:basis-[calc(100%-2rem)]">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">{source.name}</span> {sourceHost(source)}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-foreground">{source.title}</p>
            {!facts.includes(source.text) && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{source.text}</p>}
          </div>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className={cx(
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--rb-r-md)] px-2.5 text-[13px] font-medium text-primary hover:bg-accent max-desk:ml-[22px] max-desk:min-h-11",
              focusRing,
            )}
          >
            {feed.openOriginal}
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">, {source.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Reading({ entry, mode }: { entry: Entry; mode: FeedMode }) {
  return (
    <article className="max-w-3xl">
      <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground desk:text-[28px]">{entry.title}</h2>
      <div className={cx("mt-5 grid gap-6", entry.image && "desk:grid-cols-[minmax(0,1fr)_minmax(180px,260px)]")}>
        <ul className="flex flex-col gap-3 text-[15px] leading-relaxed text-foreground">
          {entry.facts.map((fact) => (
            <li key={fact} className="flex gap-3">
              <span aria-hidden="true" className="mt-[10px] size-1.5 shrink-0 rounded-full bg-[var(--rb-accent)]" />
              <span>
                {fact}
                {mode === "clustered" && fact === evidence.story.addedFact && (
                  <span className="mt-1 block text-[13px] text-muted-foreground">{feed.addedFromUpdate}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        {entry.image && (
          <figure>
            <img src={entry.image} alt={entry.imageAlt ?? ""} className="aspect-[4/3] w-full rounded-[var(--rb-r-xl)] object-cover" />
            <figcaption className="mt-1.5 text-xs text-muted-foreground">
              {feedCopy.credit}: {entry.credit}
            </figcaption>
          </figure>
        )}
      </div>
      <section className="mt-8">
        <h3 className="mb-2.5 text-[13px] font-semibold text-muted-foreground">
          {mode === "clustered" ? feed.sourcesLabel : feedCopy.original}
        </h3>
        <SourceRows sources={entry.sources} facts={entry.facts} />
      </section>
    </article>
  );
}

export default function FeedReader({ mode }: { mode: FeedMode }) {
  const all = entries[mode];
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(all[0].id);
  const [detailOpen, setDetailOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const focusDetailRef = useRef(false);
  const list = useScrollFade<HTMLDivElement>();
  const content = useScrollFade<HTMLDivElement>();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((entry) =>
      [entry.title, ...entry.facts, ...entry.sources.map((s) => s.name)].some((text) =>
        text.toLowerCase().includes(needle),
      ),
    );
  }, [all, query]);
  const groups = groupByDate(visible);
  // A search can hide the chosen story; fall back to the first visible one so one result stays selectable and tabbable.
  const activeId = visible.some((entry) => entry.id === selectedId) ? selectedId : (visible[0]?.id ?? selectedId);
  const selected = all.find((entry) => entry.id === activeId) ?? all[0];

  const open = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
    focusDetailRef.current = true;
  };

  useEffect(() => {
    if (!detailOpen || !focusDetailRef.current) return;
    focusDetailRef.current = false;
    const button = backRef.current;
    content.ref.current?.scrollTo({ top: 0 });
    // On phones the list hides; bring the reading view to the top of the screen.
    if (button && button.offsetParent !== null) {
      rootRef.current?.scrollIntoView({ block: "start" });
      button.focus({ preventScroll: true });
    }
  }, [detailOpen, selectedId, content.ref]);

  const closeDetail = () => {
    setDetailOpen(false);
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')?.focus(),
    );
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (visible.length === 0) return;
    const index = visible.findIndex((entry) => entry.id === activeId);
    let next = index;
    if (event.key === "ArrowDown") next = index < 0 ? 0 : Math.min(index + 1, visible.length - 1);
    else if (event.key === "ArrowUp") next = index <= 0 ? 0 : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visible.length - 1;
    else if (event.key === "Enter") {
      event.preventDefault();
      open(activeId);
      return;
    } else return;
    event.preventDefault();
    const id = visible[next].id;
    setSelectedId(id);
    listRef.current?.querySelector<HTMLElement>(`[data-entry="${id}"]`)?.focus({ preventScroll: false });
  };

  return (
    <div
      ref={rootRef}
      className="rb-theme-scope relative flex w-full scroll-mt-20 overflow-hidden rounded-[var(--rb-r-4xl)] border border-border bg-card text-card-foreground desk:h-[min(720px,calc(100dvh-230px))] desk:min-h-[540px]"
    >
      <section
        aria-labelledby="d2-list-heading"
        className={cx(
          "w-full min-w-0 flex-col border-border bg-muted/40 desk:flex desk:w-[340px] desk:shrink-0 desk:border-r min-[1200px]:w-[400px]",
          detailOpen ? "max-desk:hidden" : "flex",
        )}
      >
        <div className="shrink-0 px-4 pb-3 pt-4">
          <h2 id="d2-list-heading" className="text-sm font-semibold text-foreground">
            {feedCopy.listLabel[mode]}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{mode === "clustered" ? feed.clusteredHint : feed.directHint}</p>
        </div>

        <div className="relative shrink-0 px-4 pb-3">
          <Search aria-hidden="true" className="pointer-events-none absolute left-7 top-[18px] size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="d2-feed-search" className="sr-only">
            {feedCopy.search}
          </label>
          <input
            id="d2-feed-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={feedCopy.search}
            className={cx(
              "h-9 w-full rounded-[var(--rb-r-md)] border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground hover:border-ring/50 max-desk:h-11",
              focusRing,
            )}
          />
        </div>

        <div className="relative min-h-0 flex-1">
          <div ref={list.ref} onScroll={list.onScroll} className="h-full desk:overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <p className="text-sm text-foreground">{feedCopy.empty}</p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={cx(
                    "mt-4 inline-flex min-h-9 items-center rounded-[var(--rb-r-md)] border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted max-desk:min-h-11",
                    focusRing,
                  )}
                >
                  {feedCopy.clear}
                </button>
              </div>
            ) : (
              <div ref={listRef} role="listbox" aria-label={feedCopy.listLabel[mode]} onKeyDown={onListKeyDown} className="pb-3">
                {groups.map((group) => (
                  <div key={group.date} role="group" aria-label={group.date}>
                    <p aria-hidden="true" className="sticky top-0 z-10 bg-[color-mix(in_oklab,var(--card)_60%,var(--muted))] px-4 pb-1.5 pt-3 text-xs font-semibold text-muted-foreground">
                      {group.date}
                    </p>
                    {group.items.map((entry) => {
                      const isSelected = entry.id === selected.id;
                      const source = entry.sources[0];
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={isSelected ? 0 : -1}
                          data-entry={entry.id}
                          onClick={() => open(entry.id)}
                          className={cx(
                            "flex w-full cursor-pointer flex-col gap-1 border-l-2 px-4 py-3 text-left transition-[background-color,border-color] duration-150 ease-out",
                            isSelected ? "border-[var(--rb-accent)] bg-accent" : "border-transparent hover:bg-muted",
                            focusInset,
                          )}
                        >
                          {mode === "direct" && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <SourceIcon source={source} />
                              <span className="font-semibold text-foreground">{source.name}</span>
                              {sourceHost(source)}
                            </span>
                          )}
                          <span className="text-[14px] font-semibold leading-snug text-foreground">{entry.title}</span>
                          {mode === "clustered" && (
                            <span className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{entry.facts[0]}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
          <ScrollFades edges={list.edges} from="from-[color-mix(in_oklab,var(--card)_60%,var(--muted))]" />
        </div>
      </section>

      <div className={cx("min-w-0 flex-1 flex-col", detailOpen ? "flex" : "max-desk:hidden desk:flex")}>
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 desk:hidden">
          <button
            ref={backRef}
            type="button"
            aria-label={feedCopy.back}
            onClick={closeDetail}
            className={cx("inline-flex size-11 items-center justify-center rounded-[var(--rb-r-md)] bg-muted text-foreground", focusRing)}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <span className="text-sm text-muted-foreground">{selected.date}</span>
        </div>
        <div className="relative min-h-0 flex-1">
          <div ref={content.ref} onScroll={content.onScroll} className="h-full p-5 desk:overflow-y-auto desk:p-8">
            <Reading entry={selected} mode={mode} />
          </div>
          <ScrollFades edges={content.edges} />
        </div>
      </div>
    </div>
  );
}
