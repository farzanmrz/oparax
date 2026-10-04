"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Info,
  Send,
  Combine,
  Check,
  Radio,
  BadgeCheck,
  MessageCircle,
  Repeat2,
  Heart,
  ChartNoAxesColumn,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "cn";
import { Brand, SignalIcon, Mark } from "./brand";
import { PublisherIcon } from "./publisher-icon";
import { sources, stories, copy, type Story } from "../content/stories";
import { fiveEvidence } from "../content/evidence";
import { sharedCopy } from "../content/free-preview-copy";

export function SourcePost({ small = false }: { small?: boolean }) {
  return (
    <Card className={cn("source-post", small && "small")} role="article">
      <CardHeader className="px-0">
        <div className="post-head">
          <img src={fiveEvidence.post.avatar} alt="" />
          <div>
            <strong>
              {fiveEvidence.post.author}{" "}
              <BadgeCheck className="post-verified" aria-label="Verified account" />
            </strong>
            <span>{fiveEvidence.post.handle}</span>
          </div>
          <Brand name="x" />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <p>
          {sources[0].text.split(/(@\w+)/).map((text, index) =>
            text.startsWith("@") ? (
              <span className="mention" key={index}>
                {text}
              </span>
            ) : (
              text
            ),
          )}
          .
        </p>
        <time>{sharedCopy.delivery.date}</time>
      </CardContent>
      <Separator />
      <CardFooter className="post-actions px-0" aria-label="Pictured post actions">
        <Button variant="ghost" size="icon" disabled aria-label="Reply">
          <MessageCircle />
        </Button>
        <Button variant="ghost" size="icon" disabled aria-label="Repost">
          <Repeat2 />
        </Button>
        <Button variant="ghost" size="icon" disabled aria-label="Like">
          <Heart />
        </Button>
        <Button variant="ghost" size="icon" disabled aria-label="View activity">
          <ChartNoAxesColumn />
        </Button>
        <Button variant="ghost" size="icon" disabled aria-label="Share">
          <Upload />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SourceArticle({ index = 1, image = false }: { index?: number; image?: boolean }) {
  const source = sources[index];
  return (
    <Card className={cn("source-article", image && "with-image")} role="article">
      {image && (
        <img
          src={fiveEvidence.article.image}
          alt="Europa Clipper launches from Kennedy Space Center"
        />
      )}
      <CardHeader className="px-0">
        <span className="source-byline">
          <PublisherIcon source={source} className="publisher-icon-compact" />
          {source.name}
        </span>
        <CardTitle>
          <h3>{source.title}</h3>
        </CardTitle>
        <time>{sharedCopy.delivery.date}</time>
      </CardHeader>
    </Card>
  );
}

export function SourceChips({
  story = stories[0],
  onClick,
}: {
  story?: Story;
  onClick?: () => void;
}) {
  return (
    <div className="source-chips">
      {story.sources.map((source) =>
        onClick ? (
          <Button key={source.url} variant="outline" size="sm" onClick={onClick}>
            <PublisherIcon source={source} className="publisher-icon-compact" />
            {source.name}
          </Button>
        ) : (
          <Button key={source.url} variant="outline" size="sm" asChild>
            <a href={source.url} target="_blank" rel="noreferrer">
              <PublisherIcon source={source} className="publisher-icon-compact" />
              {source.name}
              <ArrowUpRight data-icon="inline-end" />
            </a>
          </Button>
        ),
      )}
    </div>
  );
}

export function StorySummary({
  story = stories[0],
  onOpen,
  compact = false,
}: {
  story?: Story;
  onOpen?: () => void;
  compact?: boolean;
}) {
  return (
    <Card className={cn("story-summary", compact && "compact")} role="article">
      <CardHeader className="px-0">
        <CardTitle>
          <h3>
            {onOpen ? (
              <Button variant="ghost" className="story-title" onClick={onOpen}>
                {story.title}
              </Button>
            ) : (
              story.title
            )}
          </h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <p>{story.facts[0]}</p>
      </CardContent>
      <CardFooter className="px-0">
        <SourceChips story={story} onClick={onOpen} />
      </CardFooter>
    </Card>
  );
}

// X is depicted using its native conversation surface rather than the site's card colors.
export function Delivery({
  onOpen,
  compact = false,
  story = stories[0],
}: {
  onOpen?: () => void;
  compact?: boolean;
  story?: Pick<Story, "title" | "date" | "facts">;
}) {
  const text = sharedCopy.delivery;
  return (
    <section className={cn("delivery", compact && "compact")} aria-label={text.label}>
      <header>
        <ArrowLeft size={17} />
        <span className="dm-avatar">
          <Mark />
        </span>
        <div>
          <strong>{text.name}</strong>
          <small>{text.handle}</small>
        </div>
        <Info size={17} />
      </header>
      <div className="dm-body">
        <time>{story.date}</time>
        <div className="dm-received">
          <span className="dm-avatar dm-sender">
            <Mark />
          </span>
          <div className="dm-message">
            <div className="dm-bubble">
              <strong>{story.title}</strong>
              <p>{story.facts[0]}</p>
              <Button variant="link" className="dm-link" onClick={onOpen} disabled={!onOpen}>
                {text.feedUrl}
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
            <Button variant="outline" className="dm-preview" onClick={onOpen} disabled={!onOpen}>
              <small>{text.domain}</small>
              <strong>{story.title}</strong>
            </Button>
          </div>
        </div>
      </div>
      <div className="dm-composer">
        <span>{text.composer}</span>
        <Send size={17} />
      </div>
    </section>
  );
}

export function Match({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("match", compact && "compact")}>
      <SignalIcon />
      <div>
        <span>{sharedCopy.feed.interests}</span>
        <p>{compact ? sharedCopy.feed.compactInterests : copy.interest}</p>
      </div>
      <Check size={16} />
    </div>
  );
}

export function Grouping() {
  return (
    <div className="grouping">
      <Combine size={16} />
      <span>{sharedCopy.feed.related}</span>
      <Separator className="group-line" />
      <strong>{sharedCopy.feed.grouped}</strong>
    </div>
  );
}

export function StageLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="stage-label">{children}</h2>;
}

export function StoryCard({
  story,
  onOpen,
  featured = false,
  compact = false,
  onSources,
}: {
  story: Story;
  onOpen: () => void;
  featured?: boolean;
  compact?: boolean;
  onSources?: () => void;
}) {
  return (
    <Card className={cn("feed-story", featured && "featured", compact && "compact")} role="article">
      <CardHeader className="feed-story-body">
        <CardTitle>
          <h2>
            <Button variant="ghost" className="story-title" onClick={onOpen}>
              {story.title}
            </Button>
          </h2>
        </CardTitle>
      </CardHeader>
      {featured && story.image && (
        <Button variant="ghost" className="story-image" onClick={onOpen}>
          <img src={story.image} alt="Falcon Heavy carrying Europa Clipper lifts off" />
          <span>{story.imageCredit}</span>
        </Button>
      )}
      <CardContent className="feed-story-body">
        <CardDescription>
          <ul className="story-facts">
            {story.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </CardDescription>
      </CardContent>
      <CardFooter className="feed-story-body feed-story-bottom">
        <SourceChips story={story} onClick={onSources || onOpen} />
        <Button variant="link" onClick={onOpen}>
          {sharedCopy.feed.readStory}
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function Evidence({ story = stories[0] }: { story?: Story }) {
  return (
    <div className="evidence-list">
      {story.sources.map((source) => (
        <Card key={source.url} size="sm" className="evidence-card">
          <a href={source.url} target="_blank" rel="noreferrer">
            <span className="evidence-icon">
              <PublisherIcon source={source} className="publisher-icon-compact" />
            </span>
            <div>
              <CardHeader className="px-0">
                <CardDescription>{source.name}</CardDescription>
                <CardTitle>{source.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <p>{source.text}</p>
              </CardContent>
            </div>
            <ArrowUpRight size={15} />
          </a>
        </Card>
      ))}
    </div>
  );
}

export function InlineSources({ story = stories[0] }: { story?: Story }) {
  return (
    <Collapsible className="inline-sources">
      <CollapsibleTrigger asChild>
        <Button variant="link">
          Explore {story.sources.length} original{" "}
          {story.sources.length === 1 ? "source" : "sources"}
          <ChevronRight data-icon="inline-end" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Evidence story={story} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Ambient({
  variant = "curves",
}: {
  variant?: "curves" | "orbits" | "ribbons" | "dots";
}) {
  return (
    <div className={`ambient ambient-${variant}`} aria-hidden="true">
      <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
        {Array.from({ length: variant === "dots" ? 8 : 14 }, (_, index) => (
          <path
            key={index}
            d={
              variant === "orbits"
                ? `M -80 ${100 + index * 40} Q 800 ${-100 + index * 24} 1680 ${180 + index * 32}`
                : `M -20 ${100 + index * 36} C 430 ${-180 + index * 42} 650 ${930 - index * 20} 1620 ${180 + index * 30}`
            }
            pathLength="1"
          />
        ))}
      </svg>
    </div>
  );
}

export function MonitorIdentity({ children }: { children?: React.ReactNode }) {
  return (
    <div className="monitor-identity">
      <div>
        <span className="monitor-kicker">
          <Radio size={15} />
          {sharedCopy.feed.monitor}
        </span>
        <h1>{copy.beat}</h1>
        <p>{sharedCopy.feed.description}</p>
      </div>
      {children}
    </div>
  );
}
