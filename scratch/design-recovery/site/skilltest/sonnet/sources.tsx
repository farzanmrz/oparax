import { clock, day, hero, sources } from "./data";
import { FeedGlyph, GitHubGlyph, ProductHuntGlyph, SiteIcon, WebGlyph, XAvatar, XGlyph } from "./marks";
import { Spot } from "./spot";

const soon = ["reddit", "youtube", "instagram", "facebook", "threads", "linkedin", "tiktok-app", "snapchat", "yahoofinance", "googlenews"];
const soonExt: Record<string, string> = { threads: "webp", instagram: "webp" };

export function Sources() {
  const rel = hero.github;
  return (
    <section className="s-sec" id="sources">
      <div className="s-wrap">
        <div className="s-head">
          <span className="s-eyebrow">Sources</span>
          <h2 className="s-h2">
            Every kind of source,
            <br />
            <span className="s-dim">weighed the same.</span>
          </h2>
          <p>
            Tell Oparax what you cover. It reads your recent X activity once, then recommends the websites and feeds to watch,
            next to the X accounts worth following.
          </p>
        </div>

        <div className="s-bento">
          <div className="s-stack s-stack-l">
          {/* the sentence */}
          <Spot className="s-tile s-composer">
            <div className="s-tile-head">
              <span className="s-mono">What do you cover?</span>
              <span className="s-mono s-t4">{sources.beat.length} / 300</span>
            </div>
            <p className="s-sentence">
              {sources.beat}
              <span className="s-caret" aria-hidden="true" />
            </p>
            <div className="s-composer-foot">
              <span className="s-mono s-t4">Recorded run for @farzanmrz</span>
              <a className="s-btn s-btn-primary s-btn-sm" href="/next/signup">
                Build my monitor
              </a>
            </div>
          </Spot>

          <Spot className="s-tile s-t-gh">
            <div className="s-tile-head">
              <span className="s-tile-title">
                <span className="s-kind s-kind-github" aria-hidden="true">
                  <GitHubGlyph size={13} />
                </span>
                GitHub
              </span>
              <span className="s-mono s-t4">
                {day(rel.published_at)}, {clock(rel.published_at)} UTC
              </span>
            </div>
            <div className="s-release">
              <div className="s-release-top">
                <strong>vercel/next.js</strong>
                <span className="s-tag">v15.0.0</span>
              </div>
              <span className="s-release-sub">The React Framework</span>
              {rel.text.split("\n").map((l) => (
                <p key={l} className="s-pr">
                  {l}
                </p>
              ))}
            </div>
          </Spot>

          </div>
          <div className="s-stack s-stack-r">
          {/* X accounts */}
          <Spot className="s-tile s-t-x">
            <div className="s-tile-head">
              <span className="s-tile-title">
                <span className="s-kind s-kind-post" aria-hidden="true">
                  <XGlyph size={12} />
                </span>
                X accounts
              </span>
              <span className="s-count s-count-post">{sources.accounts.length}</span>
            </div>
            <ul className="s-pills">
              {sources.accounts.map((a) => (
                <li key={a.id} className="s-pill">
                  <XAvatar handle={a.handle} size={22} />
                  <span>{a.name}</span>
                  <span className="s-handle">{a.handle}</span>
                </li>
              ))}
            </ul>
          </Spot>

          <div className="s-row2">
          {/* RSS feeds */}
          <Spot className="s-tile s-t-rss">
            <div className="s-tile-head">
              <span className="s-tile-title">
                <span className="s-kind s-kind-article" aria-hidden="true">
                  <FeedGlyph size={13} />
                </span>
                RSS feeds
              </span>
              <span className="s-count s-count-article">{sources.feeds.length}</span>
            </div>
            <ul className="s-pills">
              {sources.feeds.map((f) => (
                <li key={f.id} className="s-pill">
                  <SiteIcon host={f.host} size={18} />
                  <span>{f.name}</span>
                </li>
              ))}
            </ul>
          </Spot>

          {/* websites */}
          <Spot className="s-tile s-t-web">
            <div className="s-tile-head">
              <span className="s-tile-title">
                <span className="s-kind s-kind-article" aria-hidden="true">
                  <WebGlyph size={13} />
                </span>
                Websites
              </span>
              <span className="s-count s-count-article">{sources.websites.length}</span>
            </div>
            <ul className="s-pills">
              {sources.websites.map((w) => (
                <li key={w.id} className="s-pill s-pill-stack">
                  <SiteIcon host={w.host} size={18} />
                  <span>
                    {w.name}
                    <small>{w.focus}</small>
                    <small className="s-host">{w.where}</small>
                  </span>
                </li>
              ))}
            </ul>
          </Spot>

          </div>
          </div>
          {/* Product Hunt, and the sources still dim */}
          <Spot className="s-tile s-t-ph">
            <div className="s-tile-head">
              <span className="s-tile-title">
                <span className="s-kind s-kind-ph" aria-hidden="true">
                  <ProductHuntGlyph size={14} />
                </span>
                Product Hunt
              </span>
            </div>
            <div className="s-ph-body">
              <span className="s-ph-big" aria-hidden="true">
                <ProductHuntGlyph size={64} />
              </span>
              <ul className="s-soon" aria-hidden="true">
                {soon.map((n) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <li key={n}>
                    <img src={`/roadmap-brands/${n}.${soonExt[n] ?? "png"}`} alt="" loading="lazy" />
                  </li>
                ))}
              </ul>
            </div>
          </Spot>
        </div>
      </div>
    </section>
  );
}
