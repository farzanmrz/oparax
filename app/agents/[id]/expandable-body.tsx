"use client";

// Caps a source post's content region at a fixed HEIGHT (see `.clamp` in
// source-tweet.module.css) and reveals the rest behind a Show more toggle. Source posts vary
// wildly — a one-liner, a premium multi-paragraph post, a two-line post with a photo — while
// the draft beside them is one short block, so an uncapped card wrecks the row's side-by-side
// pairing.
//
// The cap covers TEXT AND MEDIA together: they're both inside the measured element, so a card
// spends one height budget rather than clamping the text and then letting a photo push the
// card twice as tall anyway. Overflow is measured after mount (scrollHeight vs clientHeight),
// re-measured when images finish loading — an <img> has zero height until then, so a
// measurement taken at mount alone would miss every media post.
//
// Every card gets the same plain expander, with no special case: the body being clamped is our
// own stored `source_posts.text`, which is complete for long ("note") posts too now that the
// ingest worker requests the v2 stream's `note_tweet` field. So "Show more" always reveals text
// we actually hold, and the label is honest on every card.
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styles from "./source-tweet.module.css";

export function ExpandableBody({ children }: { children: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    const el = bodyRef.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useEffect(() => {
    measure();
    const el = bodyRef.current;
    if (!el) return;
    // Images report their real height only once decoded; a ResizeObserver catches that (and
    // any font/layout reflow) without polling.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const img of el.querySelectorAll("img")) {
      if (!img.complete) img.addEventListener("load", measure, { once: true });
    }
    return () => observer.disconnect();
  }, [measure]);

  return (
    <>
      <div className={expanded ? undefined : styles.clamp} ref={bodyRef}>
        {children}
      </div>
      {overflowing || expanded ? (
        <button
          className={styles.expandToggle}
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </>
  );
}
