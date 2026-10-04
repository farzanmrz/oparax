import { Layers, Rows3, ExternalLink } from "lucide-react";
import { Logo, ReportChip, Stack, Thumb, GitHubMark } from "./ui";
import { SectionHead } from "./sources";
import { agent, hostOf, mai, newest, olmo, reports, week, weekTotal, when, digests } from "./data";
import { citedBy } from "./hero";
import type { FeedStory } from "@/next/data/feed";

function Card({ s, image = true, lines = 2 }: { s: FeedStory; image?: boolean; lines?: number }) {
  return (
    <article className="s2-card s2-lift-sm s2-fcard">
      {image && s.card.image ? <Thumb src={s.card.image} className="s2-thumb-cover" /> : null}
      <div className="s2-pad">
        <div className="s2-story-top">
          <Stack items={s.items.map((i) => ({ host: hostOf(i.url) }))} size={16} />
          <span className="s2-pubs">{s.items.map((i) => i.publisher).join(", ")}</span>
          <time>{when(newest(s).published_at)}</time>
        </div>
        <h3 className="s2-h3">{s.card.headline}</h3>
        <ul className="s2-facts s2-facts-c">
          {s.card.facts.slice(0, lines).map((f) => (
            <li key={f.text}>
              <p>{f.text}</p>
              <span>
                {citedBy(s, f.evidence).map((it) => (
                  <b key={it.id}><Logo host={hostOf(it.url)} size={11} round /> {it.publisher}</b>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="s2-story-chips">
          <ReportChip kind="article" />
          <span className="s2-chip h-ghost">{s.card.facts.length} facts</span>
        </div>
      </div>
    </article>
  );
}

export function FeedPage() {
  const max = Math.max(...week.map((d) => d.count), 1);
  const direct = [...reports].sort((a, b) => (a.published_at < b.published_at ? 1 : -1)).slice(0, 9);
  const gh = digests[0];
  return (
    <section className="s2-sec" id="feed">
      <div className="s2-wrap">
        <SectionHead n="Read" tone="green" title="Your page, readable without a click">
          <span className="s2-seg">
            <span className="on"><Layers size={12} /> Clustered</span>
            <span><Rows3 size={12} /> Direct</span>
          </span>
        </SectionHead>

        <div className="s2-grid-feed">
          <div className="s2-feed-l">
            <Card s={olmo} lines={2} />
            <div className="s2-feed-pair">
              <Card s={mai} image={false} lines={2} />
              <Card s={agent} image={false} lines={2} />
            </div>
            <div className="s2-card s2-lift-sm s2-digest">
              <div className="s2-card-h"><b><GitHubMark size={13} /> vercel/next.js</b><span className="s2-chip h-violet">GitHub</span></div>
              <div className="s2-pad">
                <div className="s2-tag"><span className="s2-mono">v15.0.0</span><small>{when(gh.released_at)} UTC</small><ExternalLink size={12} className="s2-dim" /></div>
                <p className="s2-dim">{gh.description}</p>
              </div>
            </div>

          </div>

          <div className="s2-feed-r">
            <div className="s2-card s2-lift-sm">
              <div className="s2-card-h"><b>Published this week</b><span className="s2-chip h-green">{weekTotal} reports</span></div>
              <div className="s2-pad">
                <div className="s2-bars">
                  {week.map((d) => (
                    <div key={d.day} title={`${d.label}: ${d.count}`}>
                      <span className="s2-bar-col"><i style={{ height: `${Math.max(d.count / max, 0.04) * 100}%` }} className={d.count ? "on" : ""} /></span>
                      <small>{d.label.split(" ")[1]}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="s2-card s2-lift-sm s2-direct">
              <div className="s2-card-h"><b>Direct, each report on its own</b><Rows3 size={13} className="s2-dim" /></div>
              <ul>
                {direct.map((r) => (
                  <li key={r.id}>
                    <Logo host={hostOf(r.url)} size={18} round />
                    <div>
                      <span><b>{r.publisher}</b><time>{when(r.published_at)}</time></span>
                      <p>{r.title.replace("[AINews] ", "")}</p>
                    </div>
                    <ReportChip kind={r.kind} />
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
