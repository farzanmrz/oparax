"use client";

import { ArrowLeft, ArrowUpRight, BookOpen, Inbox, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { PublisherIcon } from "../components/publisher-icon";
import { Delivery } from "../components/pieces";
import { Brand } from "../components/brand";
import type { DirectionProps } from "../components/types";
import { directItems } from "../content/direct-items";
import { stories, type Story } from "../content/stories";
import { d1Content as text } from "./d1-content";

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

function SelectedStory({
  item,
  clustered,
  onStory,
}: {
  item: ReadingItem;
  clustered: boolean;
  onStory: DirectionProps["onStory"];
}) {
  return (
    <article className="d1-selected-story" aria-label={text.reader}>
      <div className="d1-reader-topline">
        <span>
          <BookOpen size={14} />
          {text.synthesis}
        </span>
        {clustered && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={text.openStory}
            onClick={() => onStory(item.id)}
          >
            <ArrowUpRight />
          </Button>
        )}
      </div>
      <h2 aria-live="polite">{item.title}</h2>
      <ul className="d1-reader-facts">
        {item.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      {item.image && (
        <figure className="d1-reader-image">
          <img src={item.image} alt={text.launchAlt} />
          <figcaption>{item.imageCredit}</figcaption>
        </figure>
      )}
      <section className="d1-reader-originals" aria-label={text.originals}>
        <h3>{text.originals}</h3>
        <div className="d1-original-list">
          {item.sources.map((source) => (
            <a
              className="d1-original-row"
              href={source.url}
              target="_blank"
              rel="noreferrer"
              key={source.url}
            >
              <PublisherIcon source={source} className="publisher-icon-compact" />
              <span>
                <small>{source.name}</small>
                <strong>{source.title}</strong>
              </span>
              <ArrowUpRight size={15} />
            </a>
          ))}
        </div>
      </section>
    </article>
  );
}

export function ReadingWorkspace({
  feedMode,
  onStory,
  onLanding,
  landing = false,
}: Pick<DirectionProps, "feedMode" | "onStory" | "onLanding"> & { landing?: boolean }) {
  const items: ReadingItem[] = feedMode === "direct" ? direct : stories;
  const [selectedId, setSelectedId] = useState(items[0].id);
  const [query, setQuery] = useState("");
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const visible = items.filter((item) =>
    `${item.title} ${item.facts.join(" ")} ${item.sources.map((source) => source.name).join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <div className={cn("d1-workspace", landing && "d1-hero-workspace")}>
      {landing && (
        <header className="d1-window-bar">
          <div className="d1-window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span>
            <BookOpen size={15} />
            {text.workspace}
          </span>
          <small>{text.sample}</small>
        </header>
      )}
      <SidebarProvider className="d1-workspace-body">
        <Sidebar collapsible="none" className="d1-workspace-sidebar" aria-label={text.inboxLabel}>
          <Sidebar collapsible="none" className="d1-workspace-rail">
            <SidebarHeader>
              <BookOpen className="d1-rail-mark" aria-hidden="true" />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive
                        tooltip={text.inbox}
                        aria-label={text.inbox}
                        onClick={() => setQuery("")}
                      >
                        <Inbox />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <Button variant="ghost" size="icon-sm" aria-label={text.home} onClick={onLanding}>
                <ArrowLeft />
              </Button>
            </SidebarFooter>
          </Sidebar>
          <Sidebar collapsible="none" className="d1-workspace-list">
            <SidebarHeader className="d1-list-header">
              <h2>{text.inbox}</h2>
              <div className="d1-workspace-search">
                <Search size={15} />
                <SidebarInput
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={text.search}
                  aria-label={text.search}
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={text.clearSearch}
                    onClick={() => setQuery("")}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="d1-inbox-group">
                <SidebarGroupContent>
                  {visible.length === 0 && (
                    <p className="d1-empty-search" role="status">
                      {text.noResults}
                    </p>
                  )}
                  <SidebarMenu className="d1-story-list">
                    {visible.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          className="d1-story-row"
                          isActive={selected.id === item.id}
                          aria-pressed={selected.id === item.id}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <span className="d1-row-meta">
                            <time>{item.date}</time>
                            <span className="d1-row-selected" aria-hidden="true" />
                          </span>
                          <strong>{item.title}</strong>
                          <span className="d1-row-fact">{item.facts[0]}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </Sidebar>
        <SidebarInset className="d1-workspace-reader">
          <SelectedStory
            key={selected.id}
            item={selected}
            clustered={feedMode === "clustered"}
            onStory={onStory}
          />
        </SidebarInset>
        {landing && (
          <aside className="d1-workspace-delivery">
            <div className="d1-delivery-intro">
              <Brand name="x" />
              <h3>{text.deliveryLabel}</h3>
            </div>
            <Delivery compact story={selected} onOpen={() => onStory(selected.id)} />
            <p>{text.deliveryDescription}</p>
          </aside>
        )}
      </SidebarProvider>
    </div>
  );
}
