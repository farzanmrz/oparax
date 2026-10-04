"use client";

import { ArrowUpRight, Check, ChevronDown, Search } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { PublisherIcon } from "../components/publisher-icon";
import type { DirectionProps } from "../components/types";
import { directItems } from "../content/direct-items";
import { stories, type Story } from "../content/stories";
import { readingRoom as text } from "./d3-content";

type ReadingItem = Pick<
  Story,
  "id" | "title" | "date" | "facts" | "sources" | "image" | "imageCredit"
>;
const direct: ReadingItem[] = directItems.map((item, index) => ({
  id: `direct-${index}`,
  title: item.headline,
  date: item.date,
  facts: item.facts,
  sources: [item.source],
  image: item.image,
  imageCredit: item.credit,
}));

export function ReadingInbox({ feedMode, onStory }: Pick<DirectionProps, "feedMode" | "onStory">) {
  const items: ReadingItem[] = feedMode === "direct" ? direct : stories;
  const [selectedId, setSelectedId] = useState(items[0].id);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const originalsRef = useRef<HTMLElement>(null);
  const publishers = Array.from(
    new Map(
      items.flatMap((item) => item.sources.map((source) => [source.name, source] as const)),
    ).values(),
  );
  const visible = items.filter(
    (item) =>
      (!sourceFilter || item.sources.some((source) => source.name === sourceFilter)) &&
      `${item.title} ${item.facts.join(" ")}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = visible.find((item) => item.id === selectedId) || visible[0];
  return (
    <SidebarProvider className="d3-workspace">
      <Sidebar collapsible="none" className="d3-context-rail" aria-label={text.sourceFilter}>
        <SidebarHeader className="d3-rail-heading">
          <span>{text.matchBeat}</span>
          <h2>{text.currentBeat}</h2>
          <p>{text.interest}</p>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <h3 className="d3-rail-label">{text.sources}</h3>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={!sourceFilter} onClick={() => setSourceFilter("")}>
                    <span className="d3-all-mark">
                      <Check size={14} />
                    </span>
                    {text.allSources}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {publishers.map((source) => (
                  <SidebarMenuItem key={source.name}>
                    <SidebarMenuButton
                      isActive={sourceFilter === source.name}
                      onClick={() => setSourceFilter(source.name)}
                    >
                      <PublisherIcon source={source} className="publisher-icon-compact" />
                      {source.name}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <section className="d3-reading-stream" aria-label={text.reader}>
        <div className="d3-stream-tools">
          <p>{feedMode === "clustered" ? text.feedIntro : text.directIntro}</p>
          <div className="d3-search">
            <Search size={16} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={text.search}
              aria-label={text.searchLabel}
            />
          </div>
        </div>
        {visible.length === 0 && (
          <div className="d3-empty">
            <p>{text.noResults}</p>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setSourceFilter("");
              }}
            >
              {text.clear}
            </Button>
          </div>
        )}
        {visible.map((item) => (
          <article
            key={item.id}
            className="d3-story-sheet"
            data-selected={selected?.id === item.id}
          >
            <div className="d3-story-byline">
              <time>{item.date}</time>
              <div>
                {item.sources.map((source) => (
                  <PublisherIcon
                    key={source.url}
                    source={source}
                    className="publisher-icon-compact"
                  />
                ))}
              </div>
            </div>
            <h2>
              {feedMode === "clustered" ? (
                <Button variant="ghost" onClick={() => onStory(item.id)}>
                  {item.title}
                </Button>
              ) : (
                <a href={item.sources[0].url} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              )}
            </h2>
            <div className="d3-story-reading">
              <ul>
                {item.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              {item.image && (
                <figure>
                  <img src={item.image} alt={text.launchAlt} />
                  <figcaption>{item.imageCredit}</figcaption>
                </figure>
              )}
            </div>
            <Button
              variant="ghost"
              className="d3-context-button"
              aria-pressed={selected?.id === item.id}
              onClick={() => {
                setSelectedId(item.id);
                if (window.matchMedia("(max-width: 699px)").matches) {
                  originalsRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
                }
              }}
            >
              {selected?.id === item.id ? text.selected : text.readContext}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </article>
        ))}
      </section>
      <aside ref={originalsRef} className="d3-originals-rail" aria-label={text.originals}>
        <div className="d3-originals-sticky">
          <header>
            <h2>{text.originals}</h2>
            <p>{feedMode === "clustered" ? text.sourceHint : text.directSourceHint}</p>
          </header>
          {selected ? (
            <>
              <h3 className="d3-context-title">{selected.title}</h3>
              <div className="d3-originals-list">
                {selected.sources.map((source) => (
                  <Collapsible key={source.url} className="d3-report" defaultOpen>
                    <div className="d3-report-byline">
                      <PublisherIcon source={source} className="publisher-icon-compact" />
                      <span>{source.name}</span>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${source.name}: ${source.title}`}
                        >
                          <ChevronDown />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <a
                      className="d3-report-title"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.title}
                      <ArrowUpRight size={13} />
                    </a>
                    <CollapsibleContent>
                      <p>{source.text}</p>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </>
          ) : (
            <p className="d3-context-prompt">{text.contextPrompt}</p>
          )}
        </div>
      </aside>
    </SidebarProvider>
  );
}
