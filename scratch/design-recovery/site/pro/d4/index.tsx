"use client";

import type { DirectionProps } from "../types";
import { Feed } from "./feed";
import { Hero } from "./hero";
import { Pricing } from "./pricing";
import { Roadmap } from "./roadmap";
import { StoryTimeline } from "./story-timeline";

// Direction 4, Scroll Story: the reader's scroll tells how one story forms and grows.
export default function Direction4(props: DirectionProps) {
  if (props.page === "feed") {
    return (
      <main className="flex-1">
        <Feed mode={props.feedMode} onMode={props.onFeedMode} />
      </main>
    );
  }
  return (
    <main className="flex-1">
      <Hero onSignup={props.onSignup} onFeed={props.onFeed} />
      <StoryTimeline onFeed={props.onFeed} />
      <Roadmap />
      <Pricing onSignup={props.onSignup} />
    </main>
  );
}
