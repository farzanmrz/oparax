"use client";

import { ArrowRight, ArrowUpRight, ArrowLeft, Info, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mark, Brand } from "../components/brand";
import { FeedHeading } from "../components/feed-heading";
import { PublisherIcon } from "../components/publisher-icon";
import { RoadmapList } from "../components/roadmap-list";
import { Pricing } from "../components/shell";
import type { DirectionProps } from "../components/types";
import { stories, type Source, type Story } from "../content/stories";
import { directItems, type DirectItem } from "../content/direct-items";
import { sharedCopy } from "../content/free-preview-copy";
import { PortfolioGallery, PortfolioStory } from "./d2-portfolio-gallery";
import { galleryContent as text } from "./d2-content";

function ReportLink({ source }: { source: Source }) {
  return (
    <a className="d2-report-link" href={source.url} target="_blank" rel="noreferrer">
      <PublisherIcon source={source} className="publisher-icon-compact" />
      <span>{source.name}</span>
      <ArrowUpRight size={13} aria-hidden="true" />
    </a>
  );
}

function StoryPhoto({ image, alt, credit }: { image: string; alt: string; credit?: string }) {
  return (
    <figure className="d2-story-photo">
      <div className="d2-image-inner">
        <img src={image} alt={alt} />
      </div>
      {credit && <figcaption>{credit}</figcaption>}
    </figure>
  );
}

function Facts({ facts }: { facts: string[] }) {
  return (
    <ul className="d2-facts">
      {facts.map((fact) => (
        <li key={fact}>{fact}</li>
      ))}
    </ul>
  );
}

function StoryDelivery({ story, onOpen }: { story: Story; onOpen: () => void }) {
  const delivery = sharedCopy.delivery;
  return (
    <section className="delivery d2-message" aria-label={delivery.label}>
      <header>
        <ArrowLeft size={18} aria-hidden="true" />
        <span className="dm-avatar">
          <Mark />
        </span>
        <div>
          <strong>{delivery.name}</strong>
          <small>{delivery.handle}</small>
        </div>
        <Info size={18} aria-hidden="true" />
      </header>
      <div className="dm-body">
        <time>{story.date}</time>
        <div className="dm-received">
          <div className="dm-bubble">
            <strong>{story.title}</strong>
            <p>{story.facts[0]}</p>
            <Button variant="link" className="dm-link" onClick={onOpen}>
              {delivery.feedUrl}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
      <div className="dm-composer">
        <span>{text.messagePlaceholder}</span>
        <Send size={18} aria-hidden="true" />
      </div>
    </section>
  );
}

function SourceStrip({ story }: { story: Story }) {
  return (
    <section className="d2-source-strip" aria-labelledby="d2-sources-heading">
      <div className="d2-source-intro">
        <h2 id="d2-sources-heading">{text.sourcesLabel}</h2>
        <p>{text.sourceIntro}</p>
      </div>
      <div className="d2-source-reports">
        {story.sources.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            <PublisherIcon source={source} />
            <div>
              <strong>{source.name}</strong>
              <p>{source.title}</p>
            </div>
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

function ClusterStory({
  story,
  onStory,
  landing = false,
}: {
  story: Story;
  onStory: (id: string) => void;
  landing?: boolean;
}) {
  return (
    <PortfolioStory
      className={story.image ? "d2-story-lead" : "d2-story-reading"}
      image={
        story.image && (
          <StoryPhoto image={story.image} alt={text.launchAlt} credit={story.imageCredit} />
        )
      }
      title={
        <h2>
          <Button variant="ghost" className="d2-title-button" onClick={() => onStory(story.id)}>
            {story.title}
          </Button>
        </h2>
      }
      facts={<Facts facts={landing ? story.facts.slice(0, 2) : story.facts} />}
      footer={
        landing ? (
          <Button variant="link" onClick={() => onStory(story.id)}>
            {text.readStory}
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        ) : (
          <>
            <div className="d2-originals">
              {story.sources.map((source) => (
                <ReportLink key={source.url} source={source} />
              ))}
            </div>
            <time>{story.date}</time>
          </>
        )
      }
    />
  );
}

function Landing(props: DirectionProps) {
  const story = stories[0];
  return (
    <>
      <section id="product" className="d2-hero page-width">
        <div className="d2-introduction">
          <h1>{text.headline}</h1>
          <div className="d2-intro-copy">
            <p>{text.introduction}</p>
            <Button size="lg" onClick={props.onSignup}>
              {text.signup}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
        <div className="d2-example-caption">
          <Badge variant="outline">{text.exampleLabel}</Badge>
        </div>
        <SourceStrip story={story} />
        <div className="d2-story-edition">
          <section className="d2-synthesis" aria-labelledby="d2-engine-heading">
            <div className="d2-stage-heading">
              <h2 id="d2-engine-heading">{text.engineLabel}</h2>
              <span>{text.synthesisLabel}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </div>
            <ClusterStory story={story} onStory={props.onStory} landing />
          </section>
          <section className="d2-delivery-companion" aria-labelledby="d2-delivery-heading">
            <div className="d2-stage-heading">
              <h2 id="d2-delivery-heading">{text.deliveryLabel}</h2>
              <Brand name="x" />
            </div>
            <StoryDelivery story={story} onOpen={() => props.onStory(story.id)} />
            <div className="d2-companion-note">
              <h3>{text.deliveryIntro}</h3>
              <p>{text.companionCopy}</p>
              <Button variant="outline" onClick={props.onFeed}>
                {text.viewFeed}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </section>
        </div>
        <div className="d2-edition-note">
          <p>{text.relatedReading}</p>
          <span>{text.historical}</span>
        </div>
      </section>
      <RoadmapList />
      <Pricing onSignup={props.onSignup} variant="cards" />
    </>
  );
}

function DirectStory({ item }: { item: DirectItem }) {
  return (
    <PortfolioStory
      className={item.image ? "d2-story-lead" : "d2-story-reading"}
      image={
        item.image && (
          <StoryPhoto
            image={item.image}
            alt={item.imageAlt || item.headline}
            credit={item.credit}
          />
        )
      }
      title={
        <h2>
          <a href={item.source.url} target="_blank" rel="noreferrer">
            {item.headline}
          </a>
        </h2>
      }
      facts={<Facts facts={item.facts} />}
      footer={
        <>
          <ReportLink source={item.source} />
          <time>{item.date}</time>
        </>
      }
    />
  );
}

function Feed(props: DirectionProps) {
  const orderedDirect = [...directItems].sort(
    (a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)),
  );
  return (
    <section className="d2-feed page-width">
      <FeedHeading title={text.feedHeading} {...props} />
      <div className="d2-feed-context">
        <p>{props.feedMode === "direct" ? text.directContext : text.clusteredContext}</p>
        <span>{text.feedInterest}</span>
      </div>
      <PortfolioGallery>
        {props.feedMode === "direct"
          ? orderedDirect.map((item) => <DirectStory key={item.source.url} item={item} />)
          : stories.map((story) => (
              <ClusterStory key={story.id} story={story} onStory={props.onStory} />
            ))}
      </PortfolioGallery>
      <p className="d2-feed-footnote">{text.historical}</p>
    </section>
  );
}

export default function Direction2(props: DirectionProps) {
  return (
    <main className="d2" data-theme={props.dark ? "dark" : "light"}>
      {props.page === "landing" ? <Landing {...props} /> : <Feed {...props} />}
    </main>
  );
}
