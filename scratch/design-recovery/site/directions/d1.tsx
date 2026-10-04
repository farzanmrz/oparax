"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedContent from "../components/react-bits/AnimatedContent";
import { FeedHeading } from "../components/feed-heading";
import { RoadmapList } from "../components/roadmap-list";
import { Pricing } from "../components/shell";
import type { DirectionProps } from "../components/types";
import { d1Content as text } from "./d1-content";
import { ReadingWorkspace } from "./d1-reader";

export default function Direction1(props: DirectionProps) {
  if (props.page === "feed")
    return (
      <main className="d1 d1-feed">
        <div className="d1-content-width">
          <FeedHeading title={text.feedHeading} {...props} />
          <p className="d1-feed-description">{text.feedDescription[props.feedMode]}</p>
          <ReadingWorkspace
            feedMode={props.feedMode}
            onStory={props.onStory}
            onLanding={props.onLanding}
          />
        </div>
      </main>
    );
  return (
    <main className="d1 d1-landing">
      <section className="d1-workspace-hero d1-content-width" id="product">
        <div className="d1-workspace-headline">
          <h1>{text.headline}</h1>
          <p>{text.introduction}</p>
          <div className="d1-hero-actions">
            <Button size="lg" onClick={props.onSignup}>
              {text.signup}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="ghost" size="lg" onClick={props.onFeed}>
              {text.explore}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
        <AnimatedContent
          distance={18}
          duration={0.6}
          delay={0.08}
          animateOpacity={false}
          className="d1-workspace-reveal"
        >
          <ReadingWorkspace
            landing
            feedMode="clustered"
            onStory={props.onStory}
            onLanding={props.onLanding}
          />
        </AnimatedContent>
        <div className="d1-workflow-explanation">
          {text.workflow.map((step, index) => (
            <div key={step.heading}>
              <span className="d1-workflow-step">{index + 1}</span>
              <h2>{step.heading}</h2>
              <p>{step.detail}</p>
            </div>
          ))}
        </div>
      </section>
      <RoadmapList />
      <Pricing onSignup={props.onSignup} variant="table" />
    </main>
  );
}
