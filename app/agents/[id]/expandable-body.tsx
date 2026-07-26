"use client";

// Clamps a source post's body to a fixed number of lines with a Show more toggle. Source
// posts vary wildly in height (a one-liner to a premium multi-paragraph post) while the
// draft beside them is capped at 280 chars — unclamped, a long source wrecks the row's
// side-by-side pairing. The toggle renders only when the content actually overflows the
// clamp, measured after mount; children are server-rendered (react-tweet's TweetBody) and
// pass through untouched.
import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./source-tweet.module.css";

export function ExpandableBody({ children, media }: { children: ReactNode; media?: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, []);

  // Media rides the SAME reveal as the clamped text: while "Show more" is showing, the
  // thumbnails are part of what's folded away — a clamped card showing its images anyway
  // defeats the height cap the clamp exists for.
  const showMedia = media != null && (expanded || !overflowing);

  return (
    <>
      <div className={expanded ? undefined : styles.clamp} ref={bodyRef}>
        {children}
      </div>
      {showMedia ? media : null}
      {overflowing ? (
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
