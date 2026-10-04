"use client";

// Direction 3, Bento Wire: a short navy glow (hero-22) over one three-cell bento row whose wires
// (bento-1) carry real reports into one story and on to an X DM; the rest of the page keeps the
// tile language with real content: Direct versus Clustered, roadmap grids, pricing and a bento feed.
import { FeedHeading } from "../shared/feed-heading";
import { useSettledMotion } from "../shared/motion";
import { frame } from "../shared/shell";
import { feed } from "../content";
import type { DirectionProps } from "../types";
import Blog6 from "./blocks/blog-6";
import { Hero22 } from "./blocks/hero-22";
import { Pricing6 } from "./blocks/pricing-6";
import { SocialProof1 } from "./blocks/social-proof-1";
import { Demo } from "./demo";
import { Modes } from "./modes";

function Landing(props: DirectionProps) {
  const { running, reduced } = useSettledMotion(4800);
  return (
    <>
      <Hero22 dark={props.dark} running={running} reduced={reduced} onSignup={props.onSignup} onFeed={props.onFeed}>
        <Demo running={running} onFeed={props.onFeed} />
      </Hero22>
      <Modes onFeedMode={props.onFeedMode} />
      <SocialProof1 />
      <Pricing6 onSignup={props.onSignup} />
    </>
  );
}

function Feed(props: DirectionProps) {
  return (
    <div className={`${frame} pb-28 pt-10 desk:pt-12`}>
        <FeedHeading mode={props.feedMode} onMode={props.onFeedMode} />
        <div className="mt-8">
          <Blog6 mode={props.feedMode} />
        </div>
      <p className="mt-10 text-sm text-muted-foreground">{feed.sample}</p>
    </div>
  );
}

export default function Direction3(props: DirectionProps) {
  return <main className="flex-1">{props.page === "feed" ? <Feed {...props} /> : <Landing {...props} />}</main>;
}
