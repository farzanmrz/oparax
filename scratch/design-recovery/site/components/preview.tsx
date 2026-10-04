"use client";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import Direction1 from "../directions/d1";
import Direction2 from "../directions/d2";
import Direction3 from "../directions/d3";
import Direction4 from "../directions/d4";
import { Header, Footer, SignupDialog } from "./shell";
import { Evidence } from "./pieces";
import { stories, copy } from "../content/stories";
import type { DirectionProps } from "./types";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  typographyCandidates,
  typographyChoice,
  type TypographyChoice,
} from "../content/typography";

const directions = [
  { name: "Reading Workspace", idea: "A product-first reading workspace with a lilac identity and a source-verified shadcn inbox structure." },
  { name: "Visual Edition", idea: "A picture-led edition using the real free React Bits Portfolio gallery source, adapted to sourced stories." },
  { name: "Monitoring Desk", idea: "A teal operating desk with a React Bits Stepper demonstration and a three-region feed." },
  { name: "Source Stories", idea: "A warm plum presentation using a spatial source-card composition and a distinct reading layout." },
];
const views = [Direction1, Direction2, Direction3, Direction4];
type PageView = "landing" | "feed";
type FeedMode = "direct" | "clustered";

export default function Preview({
  initial = 1,
  initialPage = "landing",
  initialMode = "clustered",
  initialTypography = "direction",
}: {
  initial?: number;
  initialPage?: PageView;
  initialMode?: FeedMode;
  initialTypography?: TypographyChoice;
}) {
  const [direction, setDirection] = useState(initial);
  const [page, setPage] = useState<PageView>(initialPage);
  const [feedMode, setFeedMode] = useState<FeedMode>(initialMode);
  const [typography, setTypography] = useState<TypographyChoice>(initialTypography);
  const [dark, setDark] = useState(initial !== 2);
  const [signup, setSignup] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const [minimized, setMinimized] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.direction = String(direction);
  }, [dark, direction]);
  useEffect(() => {
    document.documentElement.dataset.typography = typography;
  }, [typography]);
  useEffect(() => {
    document.title = `Oparax | ${directions[direction - 1].name} | ${page === "landing" ? "Landing" : "Feed"}`;
  }, [direction, page]);
  useEffect(() => {
    const onPop = () => {
      const query = new URLSearchParams(location.search);
      setDirection(Math.max(1, Math.min(4, Number(query.get("d")) || 1)));
      setPage(query.get("view") === "feed" ? "feed" : "landing");
      setFeedMode(query.get("mode") === "direct" ? "direct" : "clustered");
      setTypography(typographyChoice(query.get("type")));
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  function navigate(nextDirection: number, nextPage: PageView, nextMode = feedMode) {
    setDirection(nextDirection);
    setPage(nextPage);
    setFeedMode(nextMode);
    history.pushState(
      null,
      "",
      `/?d=${nextDirection}&view=${nextPage}${nextPage === "feed" ? `&mode=${nextMode}` : ""}${typography === "direction" ? "" : `&type=${typography}`}`,
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const props: DirectionProps = {
    page,
    dark,
    feedMode,
    onFeedMode: (mode) => navigate(direction, "feed", mode),
    onTheme: () => setDark(!dark),
    onLanding: () => navigate(direction, "landing"),
    onFeed: () => navigate(direction, "feed"),
    onSignup: () => setSignup(true),
    onStory: setSelected,
  };
  const View = views[direction - 1];
  const story = stories.find((item) => item.id === selected);
  const candidate = typographyCandidates.find((item) => item.id === typography);
  return (
    <div className={`study study-${direction}`}>
      <Header {...props} />
      <View key={`${direction}:${page}`} {...props} />
      <Footer />
      <aside className="catalog-dock" aria-label="Design preview controls">
        <div className="catalog-dock-main">
          <Button
            variant="ghost"
            size="icon"
            aria-label={minimized ? "Expand design controls" : "Minimize design controls"}
            onClick={() => setMinimized(!minimized)}
          >
            {minimized ? <ChevronUp /> : <ChevronDown />}
          </Button>
          {!minimized && (
            <>
              <span className="catalog-dock-label">Reference Set</span>
              <nav className="catalog-directions" aria-label="Design directions">
                {directions.map((item, index) => (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={direction === index + 1 ? "default" : "ghost"}
                        size="icon"
                        aria-label={`${index + 1}. ${item.name}`}
                        aria-pressed={direction === index + 1}
                        onClick={() => navigate(index + 1, page)}
                      >
                        {index + 1}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{item.name}</TooltipContent>
                  </Tooltip>
                ))}
              </nav>
              <Separator orientation="vertical" className="h-5" />
              <Button
                variant={page === "landing" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={page === "landing"}
                onClick={() => navigate(direction, "landing")}
              >
                Landing
              </Button>
              <Button
                variant={page === "feed" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={page === "feed"}
                onClick={() => navigate(direction, "feed")}
              >
                Feed
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="About this direction"
                onClick={() => setAbout(true)}
              >
                <Info />
              </Button>
              <Separator orientation="vertical" className="h-5" />
              <Button variant="ghost" size="sm" asChild>
                <a href="/pro?d=1">Pro Exploration</a>
              </Button>
            </>
          )}
        </div>
        {!minimized && (
          <div className="typography-preview-controls">
            <label htmlFor="typography-choice">
              Typography trial
              <select
                id="typography-choice"
                value={typography}
                onChange={(event) => {
                  const next = typographyChoice(event.target.value);
                  setTypography(next);
                  const query = new URLSearchParams(location.search);
                  if (next === "direction") query.delete("type");
                  else query.set("type", next);
                  history.pushState(null, "", `/?${query}`);
                }}
              >
                <option value="direction" disabled>
                  Select a candidate
                </option>
                {typographyCandidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <p aria-live="polite">
              {candidate
                ? `Headings: ${candidate.heading} · Body: ${candidate.body}. Candidate only.`
                : "Four candidates for every direction. No design system change."}
            </p>
          </div>
        )}
      </aside>
      <SignupDialog
        open={signup}
        onClose={() => setSignup(false)}
        onFeed={() => navigate(direction, "feed")}
      />
      <Dialog
        open={Boolean(story)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="catalog-story-dialog">
          {story && (
            <>
              <DialogHeader>
                <DialogTitle className="catalog-reader-title">{story.title}</DialogTitle>
                <DialogDescription>{story.summary}</DialogDescription>
              </DialogHeader>
              {story.image && (
                <figure className="catalog-reader-image">
                  <img src={story.image} alt={story.title} />
                  <figcaption>{story.imageCredit}</figcaption>
                </figure>
              )}
              <ul className="catalog-reader-facts">
                {story.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              <h3>Original reports</h3>
              <Evidence story={story} />
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={about} onOpenChange={setAbout}>
        <DialogContent className="catalog-about">
          <DialogHeader>
            <DialogTitle>
              {direction}. {directions[direction - 1].name}
            </DialogTitle>
            <DialogDescription>{directions[direction - 1].idea}</DialogDescription>
          </DialogHeader>
          <p>
            Each direction explores a different page structure, palette and typography. Stock
            shadcn controls and real free source components provide the common foundation.
            These previews do not change the production design system.
          </p>
          <h3>What shapes these pages</h3>
          <ul>
            <li>Reading Workspace adapts the actual free shadcn sidebar-09 inbox pattern and React Bits AnimatedContent.</li>
            <li>Visual Edition adapts the gallery and reveal source from the free React Bits Portfolio template.</li>
            <li>Monitoring Desk uses the free React Bits Stepper for a source-to-story walkthrough.</li>
            <li>Source Stories adapts actual free React Bits CardSwap and Masonry, with an original reports-to-story transition inspired by your Magic Transform reference.</li>
            <li>RubberSegment supplies Direct / Clustered beside each feed heading. Stock shadcn supplies controls, dialogs, disclosures and pricing.</li>
          </ul>
          <p><a href="https://github.com/DavidHDev/rbp-portfolio" target="_blank" rel="noreferrer">Free Portfolio source</a>{" · "}<a href="https://reactbits.dev/components/stepper" target="_blank" rel="noreferrer">Stepper</a>{" · "}<a href="https://reactbits.dev/components/card-swap" target="_blank" rel="noreferrer">CardSwap</a>{" · "}<a href="https://reactbits.dev/components/masonry" target="_blank" rel="noreferrer">Masonry</a></p>
          <p>These are original Oparax compositions built from and adapting free source. No paid Application UI blocks, templates or recipes are installed.</p>
          <p>
            {copy.historical} Direct-card summaries are authored examples of the single-source
            format, not live Qwen output. The launch photo is supplied with its publisher credit.
            Stories without an available image keep the same reading structure.
          </p>
          <p>
            Signup choices open a sample feed. Accounts and monitoring are not connected in these
            previews. No paid components are used. Full React Bits Pro Application UI and Agent Kit access remains untested.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
