"use client";

import { ArrowRight, Check, GitMerge } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedHeading } from "../components/feed-heading";
import { Delivery } from "../components/pieces";
import { PublisherIcon } from "../components/publisher-icon";
import { RoadmapList } from "../components/roadmap-list";
import { Pricing } from "../components/shell";
import type { DirectionProps } from "../components/types";
import { copy, stories } from "../content/stories";
import { deskFacts, readingRoom as text } from "./d3-content";
import { ReadingInbox } from "./d3-inbox";
import { SourceDeck } from "./d3-source-deck";
import D3Stepper, { D3Step } from "./d3-stepper";

export default function Direction3(props: DirectionProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const story = stories[0];
  if (props.page === "feed") {
    return (
      <main className="d3 d3-feed page-width" aria-label={text.feed}>
        <FeedHeading title={text.feedTitle} {...props} />
        <ReadingInbox key={props.feedMode} feedMode={props.feedMode} onStory={props.onStory} />
        <p className="d3-historical">{copy.historical}</p>
      </main>
    );
  }
  return (
    <main className="d3 d3-landing" aria-label={text.landing}>
      <section className="d3-hero page-width" id="product">
        <div className="d3-hero-intro">
          <h1>{text.hero}</h1>
          <p>{text.intro}</p>
          <div className="d3-hero-actions">
            <Button size="lg" onClick={props.onSignup}>
              {text.signup}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" onClick={props.onFeed}>
              {text.explore}
            </Button>
          </div>
        </div>
        <section className="d3-operating-desk" aria-label={text.scene}>
          <SourceDeck index={sourceIndex} onIndexChange={setSourceIndex} />
          <section className="d3-engine" aria-label={text.oparax}>
            <header className="d3-stage-heading">
              <h2>{text.oparax}</h2>
              <p>{text.storyIntro}</p>
            </header>
            <D3Stepper
              initialStep={3}
              onFinalStepCompleted={props.onFeed}
              backButtonText={text.stepBack}
              nextButtonText={text.stepNext}
              finalButtonText={text.openFeed}
              renderStepIndicator={({ step, currentStep, onStepClick }) => (
                <Button
                  variant="ghost"
                  className="d3-stage-button"
                  aria-current={currentStep === step ? "step" : undefined}
                  onClick={() => onStepClick(step)}
                >
                  <span>{step < currentStep ? <Check size={12} /> : step}</span>
                  {text.steps[step - 1]}
                </Button>
              )}
            >
              <D3Step>
                <div className="d3-matching">
                  <h3>{text.matchTitle}</h3>
                  <div className="d3-beat">
                    <span>{text.matchBeat}</span>
                    <strong>{text.currentBeat}</strong>
                    <p>{text.interest}</p>
                  </div>
                  <div className="d3-matched-source">
                    <PublisherIcon
                      source={story.sources[sourceIndex]}
                      className="publisher-icon-compact"
                    />
                    <strong>{story.sources[sourceIndex].title}</strong>
                  </div>
                  <p>{text.matchBody}</p>
                  <div className="d3-status">
                    <Check size={15} />
                    {text.matchResult}
                  </div>
                </div>
              </D3Step>
              <D3Step>
                <div className="d3-connecting">
                  <h3>{text.connectTitle}</h3>
                  <div className="d3-connection-list">
                    {story.sources.map((source) => (
                      <div key={source.url}>
                        <PublisherIcon source={source} className="publisher-icon-compact" />
                        <span>{source.title}</span>
                      </div>
                    ))}
                  </div>
                  <div className="d3-grouped">
                    <GitMerge size={18} />
                    <div>
                      <span>{text.connectResult}</span>
                      <strong>{story.title}</strong>
                    </div>
                  </div>
                  <p>{text.connectBody}</p>
                </div>
              </D3Step>
              <D3Step>
                <div className="d3-synthesis">
                  <div className="d3-status">
                    <Check size={15} />
                    {text.storyStatus}
                  </div>
                  <h3>{story.title}</h3>
                  <ul>
                    {deskFacts.map((fact) => (
                      <li
                        key={fact.text}
                        data-highlight={fact.sourceUrl === story.sources[sourceIndex].url}
                      >
                        {fact.text}
                      </li>
                    ))}
                  </ul>
                  <Button variant="link" onClick={() => props.onStory(story.id)}>
                    {text.open}
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </D3Step>
            </D3Stepper>
          </section>
          <section className="d3-delivered" aria-label={text.delivery}>
            <header className="d3-stage-heading">
              <h2>{text.delivery}</h2>
              <p>{text.deliveryIntro}</p>
            </header>
            <Delivery compact onOpen={() => props.onStory(story.id)} />
          </section>
        </section>
        <p className="d3-historical">{copy.historical}</p>
      </section>
      <RoadmapList />
      <Pricing variant="table" onSignup={props.onSignup} />
    </main>
  );
}
