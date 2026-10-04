"use client";

import { gsap } from "gsap";
import { useLayoutEffect, useRef } from "react";
import { sources } from "../../content/stories";
import { PublisherIcon } from "../publisher-icon";

// Original Oparax choreography around the imported source deck, not a paid catalog component.
export function SourceFlow({
  replay,
  onProgress,
}: {
  replay: number;
  onProgress: (arrived: string[]) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = matchMedia("(max-width: 1099px)");
    if (preference.matches || narrow.matches) {
      onProgress(sources.map((source) => source.url));
      return;
    }
    onProgress([]);
    const tickets = element.querySelectorAll(".d4-flow-ticket");
    const paths = element.querySelectorAll("path");
    const timeline = gsap.timeline();
    tickets.forEach((ticket, index) => {
      timeline.fromTo(
        ticket,
        { x: -210, y: (index - 1) * 105, scale: 1, opacity: 0 },
        { x: 25, y: 0, scale: 0.8, opacity: 1, duration: 0.8, ease: "power2.inOut" },
        index,
      );
      timeline.to(
        ticket,
        { x: 70, scale: 0.45, opacity: 0, duration: 0.3, ease: "power2.in" },
        0.7 + index,
      );
      timeline.call(
        () => onProgress(sources.slice(0, index + 1).map((source) => source.url)),
        [],
        1 + index,
      );
    });
    timeline.fromTo(
      paths,
      { strokeDashoffset: 1, opacity: 0.2 },
      { strokeDashoffset: 0, opacity: 1, duration: 1.5, stagger: 0.12 },
      0,
    );
    const stop = () => {
      if (preference.matches || narrow.matches) {
        timeline.progress(1).kill();
        onProgress(sources.map((source) => source.url));
      }
    };
    preference.addEventListener("change", stop);
    narrow.addEventListener("change", stop);
    return () => {
      timeline.kill();
      preference.removeEventListener("change", stop);
      narrow.removeEventListener("change", stop);
    };
  }, [replay, onProgress]);

  return (
    <div ref={root} className="d4-gather" aria-hidden="true">
      <svg viewBox="0 0 60 350" preserveAspectRatio="none">
        <path
          pathLength="1"
          d="M 0 65 C 35 65 25 175 60 175 M 0 175 H 60 M 0 285 C 35 285 25 175 60 175"
        />
        <circle cx="55" cy="175" r="3" />
      </svg>
      {sources.map((source) => (
        <span className="d4-flow-ticket" key={source.url}>
          <span className="d4-flow-source">
            <PublisherIcon source={source} className="publisher-icon-compact" />
            {source.name}
          </span>
          <strong>{source.title}</strong>
        </span>
      ))}
    </div>
  );
}
