"use client";

// Clamps a source post's body to a fixed number of lines with a Show more toggle. Source
// posts vary wildly in height (a one-liner to a premium multi-paragraph post) while the
// draft beside them is capped at 280 chars — unclamped, a long source wrecks the row's
// side-by-side pairing. The toggle renders only when the content actually overflows the
// clamp, measured after mount; children are server-rendered (react-tweet's TweetBody) and
// pass through untouched.
import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./source-tweet.module.css";

export function ExpandableBody({ children }: { children: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, []);

  return (
    <>
      <div className={expanded ? undefined : styles.clamp} ref={bodyRef}>
        {children}
      </div>
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
