"use client";

import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SourcePost } from "../components/pieces";
import { PublisherIcon } from "../components/publisher-icon";
import { fiveEvidence } from "../content/evidence";
import { stories } from "../content/stories";
import { readingRoom as text } from "./d3-content";

export function SourceDeck({
  index,
  onIndexChange,
}: {
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const sources = stories[0].sources;
  return (
    <section className="d3-source-deck" aria-label={text.sources}>
      <header className="d3-stage-heading">
        <h2>{text.sources}</h2>
        <p>{text.sourcesIntro}</p>
      </header>
      <Tabs
        value={String(index)}
        onValueChange={(value) => onIndexChange(Number(value))}
        className="d3-source-tabs"
      >
        <TabsList aria-label={text.browse} variant="line">
          {sources.map((source, i) => (
            <TabsTrigger key={source.url} value={String(i)}>
              {text.sourceTabs[i]}
            </TabsTrigger>
          ))}
        </TabsList>
        {sources.map((source, i) => (
          <TabsContent key={source.url} value={String(i)} className="d3-source-original">
            {source.type === "x" ? (
              <SourcePost />
            ) : (
              <article className="d3-original-article">
                <div className="d3-publisher">
                  <PublisherIcon source={source} className="publisher-icon-compact" />
                  {source.name}
                </div>
                {i === 1 && (
                  <img src={fiveEvidence.article.image} alt={fiveEvidence.article.imageAlt} />
                )}
                <h3>{source.title}</h3>
                <p>{source.text}</p>
                {i === 1 && <small>{fiveEvidence.article.imageCredit}</small>}
              </article>
            )}
            <Button variant="link" asChild>
              <a href={source.url} target="_blank" rel="noreferrer">
                {text.original}
                <ArrowUpRight data-icon="inline-end" />
              </a>
            </Button>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
