"use client";

import { ArrowRight, ArrowUpRight, Check, MessageCircle, Repeat2, Heart } from "lucide-react";
import { useMemo, useState } from "react";
import SourceCardSwap, { SourceCard } from "@/components/react-bits/d4-card-swap";
import ReadingMasonry from "@/components/react-bits/d4-masonry";
import { SourceFlow } from "@/components/react-bits/d4-source-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Brand } from "../components/brand";
import { FeedHeading } from "../components/feed-heading";
import { Delivery } from "../components/pieces";
import { PublisherIcon } from "../components/publisher-icon";
import { RoadmapList } from "../components/roadmap-list";
import { Pricing } from "../components/shell";
import type { DirectionProps } from "../components/types";
import { directItems } from "../content/direct-items";
import { fiveEvidence } from "../content/evidence";
import { copy, sources, stories, type Story } from "../content/stories";
import { sourceStoriesCopy as c, sourceContributions } from "./d4-content";

function Originals({ story }: { story: Story }) {
  return (
    <div className="d4-originals" aria-label={c.originalReports}>
      {story.sources.map((source) => (
        <Button key={source.url} variant="outline" size="sm" asChild>
          <a href={source.url} target="_blank" rel="noreferrer">
            <PublisherIcon source={source} className="publisher-icon-compact" />
            {source.name}
            <ArrowUpRight data-icon="inline-end" />
          </a>
        </Button>
      ))}
    </div>
  );
}

function ReadingStory({ story, onOpen }: { story: Story; onOpen?: () => void }) {
  return (
    <Card className={`d4-reading-story ${story.image ? "d4-reading-photo" : ""}`} role="article">
      {story.image && (
        <figure className="d4-reading-image">
          <img src={story.image} alt={c.photoAlt} />
          <figcaption>{story.imageCredit}</figcaption>
        </figure>
      )}
      <CardHeader className="d4-reading-header">
        <CardTitle>
          <h2>{story.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="d4-reading-content">
        <ul>
          {story.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="d4-reading-footer">
        <Originals story={story} />
        {onOpen && (
          <Button variant="link" onClick={onOpen}>
            {c.read}
            <ArrowRight data-icon="inline-end" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function Feed(props: DirectionProps) {
  const items = useMemo(() => {
    const readingStories: Story[] =
      props.feedMode === "clustered"
        ? stories
        : directItems.map((item) => ({
            id: item.source.url,
            title: item.headline,
            date: item.date,
            topic: "",
            summary: item.facts[0],
            facts: item.facts,
            sources: [item.source],
            image: item.image,
            imageCredit: item.credit,
          }));
    return readingStories.map((story) => ({
      id: story.id,
      content: (
        <ReadingStory
          story={story}
          onOpen={props.feedMode === "clustered" ? () => props.onStory(story.id) : undefined}
        />
      ),
    }));
  }, [props.feedMode, props.onStory]);

  return (
    <section className="d4-feed page-width">
      <FeedHeading
        title={c.feedTitle}
        description={props.feedMode === "direct" ? c.directIntro : c.feedIntro}
        {...props}
      />
      <ReadingMasonry key={props.feedMode} items={items} />
      <p className="d4-historical">{copy.historical}</p>
    </section>
  );
}

function IncomingReport({ index }: { index: number }) {
  const source = sources[index];
  return (
    <>
      <div className="d4-report-byline">
        {index === 0 ? (
          <img src={fiveEvidence.post.avatar} alt={c.postAlt} />
        ) : (
          <PublisherIcon source={source} className="publisher-icon-compact" />
        )}
        <div>
          <strong>{index === 0 ? fiveEvidence.post.author : source.name}</strong>
          <span>
            {index === 0
              ? fiveEvidence.post.handle
              : source.url.replace("https://", "").split("/")[0]}
          </span>
        </div>
        {index === 0 && <Brand name="x" />}
      </div>
      {index === 1 && (
        <img className="d4-report-photo" src={fiveEvidence.article.image} alt={c.photoAlt} />
      )}
      {index !== 0 && <h3>{source.title}</h3>}
      <p>{source.text}</p>
      {index === 0 && (
        <div className="d4-depicted-actions">
          <MessageCircle />
          <Repeat2 />
          <Heart />
        </div>
      )}
    </>
  );
}

function SourceComposition(props: DirectionProps) {
  const [active, setActive] = useState(0);
  const [replay, setReplay] = useState(0);
  const [arrived, setArrived] = useState<string[]>(sources.map((source) => source.url));
  const story = stories[0];
  return (
    <section className="d4-composition page-width ph-no-autocapture" aria-label={c.journeyLabel}>
      <div className="d4-source-stage">
        <header className="d4-stage-heading">
          <h2>{c.sources}</h2>
          <p>{c.sourcesIntro}</p>
        </header>
        <div className="d4-deck-space">
          <SourceCardSwap activeIndex={active}>
            {sources.map((source, index) => (
              <SourceCard key={source.url}>
                <IncomingReport index={index} />
              </SourceCard>
            ))}
          </SourceCardSwap>
        </div>
        <div className="d4-source-selector" aria-label={c.sourceNavigation}>
          {sources.map((source, index) => (
            <Button
              key={source.url}
              variant="outline"
              size="sm"
              aria-pressed={active === index}
              onClick={() => setActive(index)}
            >
              <PublisherIcon source={source} className="publisher-icon-compact" />
              {source.name}
            </Button>
          ))}
        </div>
        <p className="d4-selection-note">{c.sourceSelection}</p>
        <Button
          className="d4-replay"
          variant="link"
          size="sm"
          onClick={() => setReplay((value) => value + 1)}
        >
          {c.connectAction}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <SourceFlow replay={replay} onProgress={setArrived} />
      <div className="d4-story-stage">
        <header className="d4-stage-heading">
          <h2>{c.oparax}</h2>
          <p>{c.storyIntro}</p>
        </header>
        <Card className="d4-connected-story" role="article">
          <CardHeader className="d4-connected-heading">
            <span>
              <Check size={14} />
              {arrived.length === sourceContributions.length ? c.synthesisLabel : c.connectingLabel}
            </span>
            <CardTitle>
              <h3>{story.title}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="d4-connected-content">
            <ul>
              {sourceContributions.map(({ fact, sourceUrl }) => {
                const source = sources.find((item) => item.url === sourceUrl);
                return (
                  <li
                    key={sourceUrl}
                    className={`d4-contribution ${!arrived.includes(sourceUrl) ? "d4-contribution-pending" : ""} ${sourceUrl === sources[active].url ? "d4-selected-fact" : ""}`}
                    aria-hidden={!arrived.includes(sourceUrl)}
                  >
                    <p>{fact}</p>
                    {source && (
                      <span>
                        <PublisherIcon source={source} className="publisher-icon-compact" />
                        {source.name}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
          <CardFooter className="d4-connected-footer">
            <Button variant="link" onClick={() => props.onStory(story.id)}>
              {c.read}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="d4-send" aria-hidden="true">
        <ArrowRight />
      </div>
      <div className="d4-delivery-stage">
        <header className="d4-stage-heading">
          <h2>{c.delivery}</h2>
          <p>{c.deliveryIntro}</p>
        </header>
        <Delivery onOpen={() => props.onStory(story.id)} />
      </div>
    </section>
  );
}

export default function Direction4(props: DirectionProps) {
  return (
    <main className="d4">
      {props.page === "feed" ? (
        <Feed {...props} />
      ) : (
        <>
          <section className="d4-hero page-width" id="product">
            <div>
              <h1>{c.hero}</h1>
              <p>{c.intro}</p>
              <span className="d4-hero-example">{c.historicalExample}</span>
            </div>
            <div className="d4-hero-actions">
              <Button size="lg" onClick={props.onSignup}>
                {c.signup}
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button variant="outline" size="lg" onClick={props.onFeed}>
                {c.feedAction}
              </Button>
            </div>
          </section>
          <SourceComposition {...props} />
          <section className="d4-journey-end page-width">
            <div>
              <h2>{c.endTitle}</h2>
              <p>{c.endIntro}</p>
            </div>
            <Button variant="outline" size="lg" onClick={props.onFeed}>
              {c.feedAction}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </section>
          <RoadmapList />
          <Pricing variant="cards" onSignup={props.onSignup} />
        </>
      )}
    </main>
  );
}
