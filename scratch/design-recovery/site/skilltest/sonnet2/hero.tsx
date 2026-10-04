import { ArrowUpDown, ChevronDown, ChevronRight, Layers, Link2, ExternalLink, Search, ArrowUp, ArrowDown, Rows3 } from "lucide-react";
import { Avatar, GitHubMark, Logo, OparaxMark, PHMark, ReportChip, Spinner, Stack, Thumb, XMark } from "./ui";
import { ThemeToggle } from "./theme";
import { beat, brief, accounts, clustered, HANDLE, hostOf, newest, sites, sol, when, status } from "./data";
import type { FeedStory } from "@/next/data/feed";

export function Nav() {
  return (
    <header className="s2-nav">
      <div className="s2-wrap s2-nav-in">
        <a href="#top" className="s2-brand">
          <OparaxMark size={20} /> Oparax
        </a>
        <nav>
          <a href="#sources">Sources</a>
          <a href="#judge">Judging</a>
          <a href="#alerts">Alerts</a>
          <a href="#feed">Your page</a>
          <a href="#plans">Pricing</a>
        </nav>
        <div className="s2-nav-r">
          <ThemeToggle />
          <a className="s2-link" href="#close">Log in</a>
          <a className="s2-btn s2-btn-primary s2-btn-sm" href="#close">Sign up</a>
        </div>
      </div>
    </header>
  );
}

export function citedBy(story: FeedStory, evidence: { item: string }[]) {
  const ids = new Set(evidence.map((e) => e.item));
  return story.items.filter((i) => ids.has(i.id));
}

function RailRow({ children, on }: { children: React.ReactNode; on?: boolean }) {
  return <li className={`s2-rail-row${on ? " on" : ""}`}>{children}</li>;
}

export function Hero() {
  const pubs = (s: FeedStory) => s.items.map((i) => i.publisher).join(", ");
  const list = clustered.slice(0, 7);
  return (
    <section className="s2-hero" id="top">
      <div className="s2-glow s2-glow-a" />
      <div className="s2-glow s2-glow-b" />
      <div className="s2-wrap s2-hero-top">
        <div className="s2-hero-copy">
          <span className="s2-chip h-green s2-chip-lg">
            <i className="s2-dot" /> Free for 7 days, no card
          </span>
          <h1>
            The wide internet,
            <br />
            brought to you on X.
          </h1>
          <p>
            Say what you cover in one sentence. Oparax watches the sources that fit, joins reports of the same event into one story, and sends you a single DM.
          </p>
          <div className="s2-cta">
            <a className="s2-btn s2-btn-primary" href="#close"><XMark size={13} /> Sign up with X</a>
            <a className="s2-btn s2-btn-ghost" href="#feed">See a feed <ChevronRight size={14} /></a>
          </div>
          <ul className="s2-keys">
            <li className="h-blue"><XMark size={11} /> X accounts</li>
            <li className="h-cyan"><Logo host="vercel.com" size={13} /> Websites</li>
            <li className="h-amber"><span className="s2-rss" /> RSS feeds</li>
            <li className="h-violet"><GitHubMark size={12} /> GitHub</li>
            <li className="h-orange"><PHMark size={12} /> Product Hunt</li>
          </ul>
        </div>

        <div className="s2-sentence-card s2-lift-sm">
          <div className="s2-card-h"><b>Your sentence</b><span className="s2-chip h-blue"><XMark size={10} /> Read from X once</span></div>
          <div className="s2-pad">
            <div className="s2-sentence">
              <p>{beat}</p>
            </div>
            <div className="s2-tags">
              {brief.interests.map((t) => (
                <span key={t} className="s2-chip h-ghost">{t}</span>
              ))}
            </div>
            <div className="s2-verdicts">
              <div><Logo host="vercel.com" size={15} round /><span>Microsoft AI models arrive on Vercel's AI Gateway</span><span className="s2-chip h-green">Fits</span></div>
              <div><Logo host="huggingface.co" size={15} round /><span>Olmo-core 3 scales open MoE training</span><span className="s2-chip h-green">Fits</span></div>
              <div className="s2-chk"><Spinner /><span>Checking 1 item</span></div>
            </div>
          </div>
        </div>

        <div className="s2-dm s2-lift" aria-label="The DM on X">
          <div className="s2-dm-head">
            <span className="s2-bot"><OparaxMark size={15} /></span>
            <div>
              <b>Oparax</b>
              <small>@oparax_ai</small>
            </div>
            <span className="s2-chip h-blue" style={{ marginLeft: "auto" }}><XMark size={10} /> DM</span>
          </div>
          <div className="s2-dm-body">
            <time>{when(newest(sol).published_at)} UTC</time>
            <div className="s2-bubble">
              <small>New story for your beat</small>
              <strong>{sol.card.headline}</strong>
              <p>{sol.card.facts[2].text}</p>
              <div className="s2-linkcard">
                <Thumb src={sol.card.image} />
                <div>
                  <span>oparax.ai/{HANDLE}</span>
                  <b>2 reports, 5 facts</b>
                </div>
                <ExternalLink size={13} />
              </div>
            </div>
          </div>
          <div className="s2-dm-foot">
            <span>Message</span>
          </div>
        </div>
      </div>

      <div className="s2-wrap">
        <div className="s2-window s2-lift">
          <div className="s2-bar">
            <OparaxMark size={15} />
            <span className="s2-sep">/</span>
            <Avatar handle="@farzanmrz" size={18} />
            <b>@{HANDLE}</b>
            <span className="s2-chip h-amber s2-mono">FREE WEEK</span>
            <span className="s2-sep">/</span>
            <span className="s2-dim">Feed</span>
            <span className="s2-bar-r">
              <span className="s2-seg">
                <span className="on"><Layers size={12} /> Clustered <i>7</i></span>
                <span><Rows3 size={12} /> Direct <i>10</i></span>
              </span>
            </span>
          </div>
          <div className="s2-panes">
            <aside className="s2-rail">
              <div className="s2-rail-top">
                <Avatar handle="@farzanmrz" size={22} />
                <b>{HANDLE}</b>
                <ChevronDown size={13} />
                <Search size={13} style={{ marginLeft: "auto" }} />
              </div>
              <ul>
                <RailRow on><Layers size={13} /> Feed <i>7</i></RailRow>
                <RailRow><GitHubMark size={13} /> Digests <i>1</i></RailRow>
              </ul>
              <p className="s2-rail-h">Sites and feeds <i>{sites.length}</i></p>
              <ul>
                {sites.slice(0, 6).map((s) => (
                  <RailRow key={s.id}>
                    <Logo host={s.host} size={14} />
                    <span className="t">{s.name}</span>
                    <em>{s.kind === "rss" ? "Feed" : "Site"}</em>
                  </RailRow>
                ))}
                <RailRow><GitHubMark size={13} /><span className="t">vercel/next.js</span><em>Releases</em></RailRow>
                <RailRow><span className="s2-ph"><PHMark size={11} /></span><span className="t">Product Hunt</span><em>Launches</em></RailRow>
              </ul>
              <p className="s2-rail-h">X accounts <i>{accounts.length}</i></p>
              <ul>
                {accounts.slice(0, 5).map((a) => (
                  <RailRow key={a.id}>
                    <Avatar handle={a.handle} size={15} />
                    <span className="t">{a.name}</span>
                    <em>{a.handle}</em>
                  </RailRow>
                ))}
              </ul>
            </aside>

            <section className="s2-list">
              <div className="s2-list-h">
                <b>Stories</b> <i>7</i>
                <span><ArrowUpDown size={12} /> Newest</span>
              </div>
              <div className="s2-checking"><Spinner /> Checking 1 item against your sentence</div>
              {list.map((s) => (
                <article key={s.id} className={`s2-story${s.id === sol.id ? " on" : ""}`}>
                  <div className="s2-story-top">
                    <Stack items={s.items.map((i) => ({ host: hostOf(i.url) }))} size={16} />
                    <span className="s2-pubs">{pubs(s)}</span>
                    <time>{when(newest(s).published_at)}</time>
                  </div>
                  <h4>{s.card.headline}</h4>
                  <div className="s2-story-chips">
                    {[...new Set(s.items.map((i) => i.kind))].map((k2) => (
                      <ReportChip key={k2} kind={k2} n={s.items.filter((i) => i.kind === k2).length} />
                    ))}
                    {s.items.length > 1 ? <span className="s2-chip h-ghost"><Layers size={11} /> {s.items.length} reports</span> : null}
                  </div>
                </article>
              ))}
            </section>

            <section className="s2-open">
              <div className="s2-open-h">
                <Layers size={13} /> <span className="s2-dim">Story</span> <span className="s2-sep">/</span>
                <span className="s2-trunc">{sol.card.headline}</span>
                <span className="s2-open-r">
                  <i>4 / 7</i> <ArrowUp size={13} /> <ArrowDown size={13} />
                  <span className="s2-sq"><Link2 size={13} /></span>
                  <span className="s2-sq"><ExternalLink size={13} /></span>
                </span>
              </div>
              <div className="s2-open-b">
                <div className="s2-open-title">
                  <div>
                    <div className="s2-story-chips">
                      <ReportChip kind="article" n={2} />
                      <span className="s2-chip h-ghost">5 facts</span>
                      <span className="s2-chip h-ghost">{when(newest(sol).published_at)} UTC</span>
                    </div>
                    <h2>{sol.card.headline}</h2>
                  </div>
                  <Thumb src={sol.card.image} className="s2-thumb-lg" />
                </div>
                <ul className="s2-facts">
                  {sol.card.facts.map((f) => (
                    <li key={f.text}>
                      <p>{f.text}</p>
                      <span>
                        {citedBy(sol, f.evidence).map((it) => (
                          <b key={it.id}><Logo host={hostOf(it.url)} size={11} round /> {it.publisher}</b>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="s2-used">Used 2 sources <ChevronDown size={13} /></div>
                {sol.items.map((it) => (
                  <div className="s2-srccard" key={it.id}>
                    <Logo host={hostOf(it.url)} size={22} round />
                    <div>
                      <b>{it.publisher}</b> <small>{hostOf(it.url)}</small>
                      <p>{it.title}</p>
                    </div>
                    <ReportChip kind="article" />
                    <time>{when(it.published_at)}</time>
                  </div>
                ))}
              </div>
            </section>

            <aside className="s2-side">
              <div className="s2-side-b">
                <small>Alerts on X</small>
                <span className="s2-off"><i className="s2-dot s2-dot-off" /> Not connected</span>
                <a className="s2-btn s2-btn-primary s2-btn-full" href="#alerts"><XMark size={12} /> Get alerts on X</a>
              </div>
              <div className="s2-side-b">
                <small>Agent</small>
                <span className="s2-live"><i className="s2-dot" /> Live</span>
                <p>Watching 10 sites and feeds, 7 X accounts</p>
              </div>
              <div className="s2-side-2">
                <div><small>Checking</small><span className="s2-num"><Spinner />{status.pending}</span></div>
                <div><small>Failed</small><span className="s2-num s2-red"><i className="s2-dot s2-dot-red" />{status.failed}</span></div>
              </div>
              <div className="s2-side-b">
                <small>Free week</small>
                <b>{status.daysLeft} days left</b>
                <span className="s2-segs">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>
              </div>
              <div className="s2-side-b">
                <small>Watched X posts</small>
                <b>{status.poolUsed} of {status.poolLimit}</b>
                <span className="s2-meter"><i style={{ width: "3%" }} /></span>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
