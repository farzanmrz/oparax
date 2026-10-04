"use client";

import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { directItems } from "../content/direct-items";
import { sharedCopy } from "../content/free-preview-copy";
import { Brand } from "./brand";
import { PublisherIcon } from "./publisher-icon";
import type { Story } from "../content/stories";
import type { DirectionProps } from "./types";

export function FeedModes(_props: Pick<DirectionProps, "feedMode" | "onFeedMode">) {
  return null;
}

export function DirectFeed({ direction, items }: { direction: number; items?: Story[] }) {
  const text = sharedCopy.feed;
  const allowed = items
    ? new Set(items.flatMap((story) => story.sources.map((source) => source.url)))
    : null;
  const reports = directItems.filter((item) => !allowed || allowed.has(item.source.url));
  return (
    <div className={`direct-feed direct-feed-${direction}`} aria-label={text.direct}>
      {reports.map(({ source, date, headline, facts, image, imageAlt, credit }) => (
        <Card key={source.url} className={`direct-item direct-${source.type}`}>
          <CardHeader className="px-0">
            <CardTitle>
              <h2>{headline}</h2>
            </CardTitle>
            <div className="direct-byline">
              <PublisherIcon source={source} />
              <div>
                <strong>{source.name}</strong>
                <div className="direct-meta">
                  <Badge variant="outline">{source.type === "x" ? text.post : text.article}</Badge>
                  <time>{date}</time>
                </div>
              </div>
              {source.type === "x" && <Brand name="x" />}
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {image && (
              <figure>
                <img src={image} alt={imageAlt || headline} />
                <figcaption>{credit}</figcaption>
              </figure>
            )}
            <div className="direct-facts">
              {facts.map((fact) => (
                <p key={fact}>{fact}</p>
              ))}
            </div>
          </CardContent>
          <CardFooter className="px-0">
            <Button variant="link" asChild>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.type === "x" ? text.viewPost : text.readArticle}
                <ArrowUpRight data-icon="inline-end" />
              </a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
