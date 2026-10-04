"use client";

import type { DirectionProps } from "../types";
import { Features13 } from "./blocks/features-13";
import { Pricing13 } from "./blocks/pricing-13";
import { Feed } from "./feed";
import { Hero } from "./hero";
import { Roadmap } from "./roadmap";

// Direction 1, Transform: reports visibly turn into one story, then the page explains how to read,
// where Oparax goes next and what it costs.
export default function Direction1(props: DirectionProps) {
  return (
    <main className="flex-1">
      {props.page === "feed" ? (
        <Feed feedMode={props.feedMode} onFeedMode={props.onFeedMode} />
      ) : (
        <>
          <Hero onSignup={props.onSignup} onFeed={props.onFeed} />
          <Features13 />
          <Roadmap />
          <Pricing13 onSignup={props.onSignup} />
        </>
      )}
    </main>
  );
}
