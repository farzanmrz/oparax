import { Rss, ChevronRight, Plus, Filter } from "lucide-react";
import { Avatar, GitHubMark, Logo, PHMark, SourcePill, XMark, type Hue } from "./ui";
import { accounts, droppedSample, kindMeta, sourceRows, status, when, digests, recentItems, hostOf, totals } from "./data";

export function SectionHead({ n, tone, title, children }: { n: string; tone: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="s2-sec-head">
      <div>
        <span className={`s2-eyebrow h-${tone}`}><i className="s2-dot" style={{ background: "currentColor" }} /> {n}</span>
        <h2>{title}</h2>
      </div>
      <div className="s2-sec-aside">{children}</div>
    </div>
  );
}

const tabs = [
  { label: "All", count: totals.all },
  { label: "X accounts", count: totals.x, hue: "blue" },
  { label: "Websites", count: totals.website, hue: "cyan" },
  { label: "RSS feeds", count: totals.rss, hue: "amber" },
  { label: "GitHub", count: 1, hue: "violet" },
  { label: "Product Hunt", count: 1, hue: "orange" },
];

export function Sources() {
  const release = digests[0];
  const feed = recentItems.vercelMai;
  return (
    <section className="s2-sec" id="sources">
      <div className="s2-wrap">
        <SectionHead n="Watch" tone="blue" title="Every source on your beat, polled for you">
          <span className="s2-chip h-ghost">Sites and feeds are unlimited</span>
          <span className="s2-chip h-ghost">Each source checked once for everyone who watches it</span>
        </SectionHead>

        <div className="s2-grid-sources">
          <div className="s2-card s2-lift-sm s2-table-card">
            <div className="s2-card-h">
              <b>Sources</b>
              <span className="s2-tabs">
                {tabs.map((t, i) => (
                  <span key={t.label} className={i === 0 ? "on" : ""}>
                    {t.hue ? <i className={`s2-dot h-${t.hue}`} style={{ background: "currentColor" }} /> : null}
                    {t.label} <em>{t.count}</em>
                  </span>
                ))}
              </span>
              <span className="s2-sq"><Filter size={13} /></span>
            </div>
            <table className="s2-table">
              <thead>
                <tr><th>Source</th><th>Kind</th><th>What it covers</th><th>Status</th></tr>
              </thead>
              <tbody>
                {sourceRows.map((r) => (
                  <tr key={r.name + r.kind}>
                    <td>
                      <span className="s2-cell">
                        {r.handle ? <Avatar handle={r.handle} size={20} /> : r.kind === "product_hunt" ? <span className="s2-ph s2-ph-lg"><PHMark size={13} /></span> : <Logo host={r.host!} size={20} />}
                        <span><b>{r.name}</b><small>{r.sub}</small></span>
                      </span>
                    </td>
                    <td><SourcePill kind={r.kind} hue={kindMeta[r.kind].hue as Hue} label={kindMeta[r.kind].label} /></td>
                    <td className="s2-focus">{r.focus}</td>
                    <td><span className="s2-live"><i className="s2-dot" /> Live</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="s2-card-f">
              <Plus size={13} /> {totals.all - sourceRows.length} more sources, chosen from 153 candidates
            </div>
          </div>

          <div className="s2-stack-col">
            <div className="s2-card s2-lift-sm">
              <div className="s2-card-h"><b>Watched X accounts</b><span className="s2-chip h-blue"><XMark size={10} /> Monthly pool</span></div>
              <div className="s2-pad">
                <div className="s2-bignum"><b>{status.poolUsed}</b><span>of {status.poolLimit} watched posts this week</span></div>
                <span className="s2-meter s2-meter-lg"><i style={{ width: "4%" }} /></span>
                <ul className="s2-acc">
                  {accounts.slice(0, 5).map((a) => (
                    <li key={a.id}>
                      <Avatar handle={a.handle} size={22} />
                      <span><b>{a.name}</b><small>{a.handle}</small></span>
                      <span className="s2-live"><i className="s2-dot" /></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="s2-two">
              <div className="s2-card s2-lift-sm s2-release">
                <div className="s2-card-h"><b><GitHubMark size={13} /> vercel/next.js</b><span className="s2-chip h-violet">Release</span></div>
                <div className="s2-pad">
                  <div className="s2-tag"><span className="s2-mono">v15.0.0</span><small>{when(release.released_at)} UTC</small></div>
                  <p className="s2-code">Support React 19 in App and Pages router: #65058</p>
                  <p className="s2-code s2-code-r">[Breaking] Disable automatic fetch caching: #66004</p>
                </div>
              </div>
              <div className="s2-card s2-lift-sm s2-rssc">
                <div className="s2-card-h"><b><Rss size={13} /> RSS feed</b><span className="s2-chip h-amber">Atom</span></div>
                <div className="s2-pad">
                  <div className="s2-url s2-mono">vercel.com/atom</div>
                  <div className="s2-entry">
                    <Logo host={hostOf(feed.url)} size={16} />
                    <span>{feed.title}</span>
                  </div>
                  <small className="s2-dim">{when(feed.published_at)} UTC</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="s2-left-out">
          <span className="s2-dim">Read and left out for this beat</span>
          {droppedSample.slice(0, 6).map((d) => (
            <span key={d.id} className="s2-chip h-red-ghost">
              {d.kind === "x_account" ? <XMark size={10} /> : <Rss size={10} />} {d.name}
            </span>
          ))}
          <span className="s2-dim s2-more">+ more <ChevronRight size={12} /></span>
        </div>
      </div>
    </section>
  );
}
