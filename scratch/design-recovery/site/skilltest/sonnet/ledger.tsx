"use client";

import { useState } from "react";
import { clock, day, hostOf, ledger } from "./data";
import { KindTile, SiteIcon } from "./marks";

function DocHead({ item }: { item: typeof ledger.left }) {
  return (
    <div className="s-l-head s-l-doc-head">
      <div className="s-l-doc-top">
        <SiteIcon host={hostOf(item.url)} size={18} />
        <strong>{item.publisher}</strong>
        <span className="s-mono s-t4">{hostOf(item.url)}</span>
      </div>
      <p className="s-l-doc-title">{item.title.replace(/^\[AINews\]\s*/, "")}</p>
      <div className="s-l-doc-meta">
        <KindTile kind="article" size={18} />
        <span className="s-mono">
          {day(item.published_at)}, {clock(item.published_at)} UTC
        </span>
      </div>
    </div>
  );
}

function Quote({ span, side }: { span: string | null; side: "l" | "r" }) {
  if (!span) return <div className={`s-l-cell s-l-empty s-l-${side}`} />;
  return (
    <div className={`s-l-cell s-l-${side}`}>
      <blockquote>{span}</blockquote>
    </div>
  );
}

export function Ledger() {
  const [active, setActive] = useState(1);
  const rows = ledger.rows;
  return (
    <div className="s-ledger" data-active={active}>
      {/* left report */}
      <div className="s-l-col s-l-left">
        <DocHead item={ledger.left} />
        {rows.map((r, i) => (
          <div key={i} className="s-l-row" data-on={active === i} onMouseEnter={() => setActive(i)}>
            <Quote span={r.left} side="l" />
          </div>
        ))}
      </div>

      <div className="s-l-gut">
        <div className="s-l-head" />
        {rows.map((r, i) => (
          <div key={i} className="s-l-row s-l-gutrow" data-on={active === i}>
            {r.left ? <span className="s-wire s-wire-l" /> : null}
          </div>
        ))}
      </div>

      {/* the story */}
      <div className="s-l-col s-l-mid">
        <div className="s-l-head s-l-story-head">
          <div className="s-chips">
            <span className="s-chip s-chip-article">2 Articles</span>
            <span className="s-chip s-chip-plain">{rows.length} facts</span>
          </div>
          <h3>{ledger.story.card.headline}</h3>
        </div>
        {rows.map((r, i) => (
          <button
            key={i}
            type="button"
            className="s-l-row s-l-fact"
            data-on={active === i}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
          >
            <span className="s-l-n">{String(i + 1).padStart(2, "0")}</span>
            <span className="s-l-text">{r.text}</span>
          </button>
        ))}
      </div>

      <div className="s-l-gut">
        <div className="s-l-head" />
        {rows.map((r, i) => (
          <div key={i} className="s-l-row s-l-gutrow" data-on={active === i}>
            {r.right ? <span className="s-wire s-wire-r" /> : null}
          </div>
        ))}
      </div>

      {/* right report */}
      <div className="s-l-col s-l-right">
        <DocHead item={ledger.right} />
        {rows.map((r, i) => (
          <div key={i} className="s-l-row" data-on={active === i} onMouseEnter={() => setActive(i)}>
            <Quote span={r.right} side="r" />
          </div>
        ))}
      </div>
    </div>
  );
}
