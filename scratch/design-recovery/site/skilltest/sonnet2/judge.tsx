import { Check, Layers, Link2, Quote } from "lucide-react";
import { Avatar, Logo, ReportChip, Spinner, Thumb, XMark } from "./ui";
import { SectionHead } from "./sources";
import { beat, brief, candidateCount, kept, posts, recentItems, sol, hostOf, when } from "./data";
import { citedBy } from "./hero";

export function Judge() {
  const incoming = [recentItems.olmoCore, recentItems.vercelMai, recentItems.vercelAgent, recentItems.latentSol, recentItems.simonSol, recentItems.mistralMunich];
  const joined = new Set([recentItems.latentSol.id, recentItems.simonSol.id]);
  const f1 = sol.card.facts[1];
  const f3 = sol.card.facts[3];
  return (
    <section className="s2-sec" id="judge">
      <div className="s2-wrap">
        <SectionHead n="Judge" tone="green" title="Every new item is read against your sentence">
          <span className="s2-chip h-ghost">The full article is read, never cut</span>
          <span className="s2-chip h-ghost">Every fact cites its source</span>
        </SectionHead>

        <div className="s2-pipe">
          <div className="s2-card s2-lift-sm s2-pipe-a">
            <div className="s2-card-h"><b>Your sentence</b><span className="s2-chip h-blue"><XMark size={10} /> Read from X once</span></div>
            <div className="s2-pad">
              <div className="s2-sentence">
                <Quote size={14} />
                <p>{beat}</p>
              </div>
              <div className="s2-tags">
                {brief.interests.map((t) => (
                  <span key={t} className="s2-chip h-ghost">{t}</span>
                ))}
                <span className="s2-chip h-ghost">English</span>
              </div>
              <p className="s2-mini-h">Your recent posts, read to learn this</p>
              <ul className="s2-posts">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Avatar handle="@farzanmrz" size={22} />
                    <div>
                      <span><b>Farzan</b> <small>@farzanmrz</small> <time>{when(`${p.date}T00:00:00Z`, false)}</time></span>
                      <p>{p.text.split("\n")[0]}</p>
                      {p.quoted ? <div className="s2-quoted"><b>{p.quoted.author}</b> {p.quoted.text}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="s2-readout">
                <div><b>{candidateCount}</b><small>candidates read</small></div>
                <div className="s2-g"><b>{kept.length}</b><small>fit the sentence</small></div>
                <div><b>17</b><small>sources chosen</small></div>
              </div>
            </div>
          </div>

          <div className="s2-card s2-lift-sm s2-pipe-b">
            <div className="s2-card-h"><b>New reports</b><span className="s2-chip h-green"><Check size={11} /> Judged</span></div>
            <ul className="s2-in">
              <li className="s2-in-check"><Spinner /> Checking 1 item against your sentence</li>
              {incoming.map((it) => (
                <li key={it.id} className={joined.has(it.id) ? "joined" : ""}>
                  <Logo host={hostOf(it.url)} size={20} round />
                  <div>
                    <span><b>{it.publisher}</b><time>{when(it.published_at)}</time></span>
                    <p>{it.title.replace("[AINews] ", "")}</p>
                  </div>
                  <span className="s2-in-r">
                    <ReportChip kind="article" />
                    {joined.has(it.id) ? <span className="s2-chip h-blue"><Link2 size={10} /> Joined</span> : <span className="s2-chip h-green"><Check size={10} /> Fits</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="s2-card s2-lift s2-pipe-c">
            <div className="s2-glow-in" />
            <div className="s2-card-h"><b><Layers size={13} /> One story</b><span className="s2-chip h-blue"><Link2 size={10} /> 2 reports joined</span></div>
            <div className="s2-pad">
              <div className="s2-open-title">
                <div>
                  <div className="s2-story-chips">
                    <ReportChip kind="article" n={2} />
                    <span className="s2-chip h-ghost">5 facts</span>
                  </div>
                  <h3 className="s2-h3">{sol.card.headline}</h3>
                </div>
                <Thumb src={sol.card.image} className="s2-thumb-md" />
              </div>
              <ul className="s2-facts s2-facts-c">
                {sol.card.facts.slice(0, 4).map((f) => (
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
              <div className="s2-evidence">
                <div className="s2-evi">
                  <Logo host="latent.space" size={14} round /> <b>Latent Space</b>
                  <p>“{f1.evidence[1].span.replace(/[“”]/g, '"').replace(/^"|"$/g, "")}”</p>
                </div>
                <div className="s2-evi s2-evi-g">
                  <Logo host="simonwillison.net" size={14} round /> <b>Simon Willison</b>
                  <p>“{f3.evidence[0].span}”</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
