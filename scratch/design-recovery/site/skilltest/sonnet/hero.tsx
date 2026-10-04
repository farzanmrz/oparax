import { ArrowRight } from "lucide-react";
import { clock, factKinds, hero, hostOf, kindOf, kindWord, PREVIEW_NOTE, type Kind } from "./data";
import { Cover, GitHubGlyph, KindGlyph, OparaxMark, SiteIcon, XAvatar, XGlyph } from "./marks";

const [blog, release, post] = hero.reports; // arrival order is the real publication order

export function Hero() {
  const facts = factKinds(hero.story);
  const dmLines = hero.dm.split("\n\n");
  const dmHead = dmLines[0];
  const [dmTitle, dmFact, dmLink] = dmLines[1].split("\n");
  const kinds = (["post", "article", "github"] as Kind[]).map((k) => ({
    kind: k,
    count: hero.story.items.filter((i) => kindOf(i) === k).length,
  }));

  return (
    <section className="s-hero" id="top">
      <div className="s-hero-light" aria-hidden="true" />
      <div className="s-hero-dots" aria-hidden="true" />
      <div className="s-wrap s-hero-head">
        <h1 className="s-h1">
          The internet beyond X,
          <br />
          <span className="s-h1-accent">delivered to X.</span>
        </h1>
        <div className="s-hero-side">
          <p>
            Write one sentence about what you cover. Oparax watches the sources, joins reports of the same event into one
            story, and sends it to your X DMs.
          </p>
          <div className="s-cta-row">
            <a className="s-btn s-btn-primary" href="/next/signup">
              Sign up <ArrowRight size={15} strokeWidth={2} />
            </a>
            <span className="s-cta-note">Free for seven days. No card.</span>
          </div>
        </div>
      </div>

      <div className="s-wrap">
        <div className="s-stage-fit">
          <div className="s-stage" role="img" aria-label="Three reports, an X post, an article and a GitHub release, become one story and one X DM.">
            {/* traces: one per report into the story, one from the story to the DM */}
            <svg className="s-traces" viewBox="0 0 1176 640" preserveAspectRatio="none" aria-hidden="true">
              <path className="s-trace s-trace-article" d="M300 104 C 345 104, 330 270, 372 270" />
              <path className="s-trace s-trace-github" d="M322 290 C 346 290, 350 270, 372 270" />
              <path className="s-trace s-trace-post" d="M300 466 C 345 466, 330 270, 372 270" />
              <path className="s-trace s-trace-out" d="M848 270 L 892 270" />
            </svg>
            <span className="s-node s-node-in" style={{ left: 372, top: 270 }} aria-hidden="true" />
            <span className="s-node s-node-out" style={{ left: 848, top: 270 }} aria-hidden="true" />

            {/* 1. the three reports, in the order they were published */}
            <article className="s-card s-src s-src-article s-in s-in-1" style={{ left: 0, top: 0, width: 300 }}>
              {blog.image ? <Cover src={blog.image} className="s-src-cover" /> : null}
              <div className="s-src-body">
                <div className="s-src-meta">
                  <SiteIcon host={hostOf(blog.url)} size={16} />
                  <span>{blog.publisher}</span>
                  <time>{clock(blog.published_at)} UTC</time>
                </div>
                <h3>{blog.title}</h3>
                <p>{blog.text}</p>
              </div>
            </article>

            <article className="s-card s-src s-src-github s-in s-in-2" style={{ left: 22, top: 228, width: 300 }}>
              <div className="s-src-body">
                <div className="s-src-meta">
                  <span className="s-gh-mark">
                    <GitHubGlyph size={15} />
                  </span>
                  <span>vercel/next.js</span>
                  <span className="s-tag">v15.0.0</span>
                  <time>{clock(release.published_at)} UTC</time>
                </div>
                {release.text.split("\n").map((line) => (
                  <p key={line} className="s-pr">
                    {line}
                  </p>
                ))}
              </div>
            </article>

            <article className="s-card s-src s-src-post s-in s-in-3" style={{ left: 0, top: 410, width: 300 }}>
              <div className="s-src-body">
                <div className="s-src-meta">
                  <XAvatar handle={post.author ?? "@nextjs"} size={20} />
                  <span>{post.publisher}</span>
                  <span className="s-handle">{post.author}</span>
                  <time>{clock(post.published_at)} UTC</time>
                </div>
                <p className="s-post-text">{post.text.split("\n\n").slice(0, 2).join(" ")}</p>
              </div>
            </article>

            {/* 2. the story they become */}
            <article className="s-card s-story s-in s-in-4" style={{ left: 372, top: 0, width: 476 }}>
              <header className="s-story-top">
                <div className="s-chips">
                  {kinds.map((k) => (
                    <span key={k.kind} className={`s-chip s-chip-${k.kind}`}>
                      <KindGlyph kind={k.kind} size={12} />
                      {k.count} {kindWord[k.kind]}
                    </span>
                  ))}
                </div>
                <span className="s-mono">Oct 21, 2024</span>
              </header>
              <h2>{hero.story.card.headline}</h2>
              <ol className="s-facts">
                {facts.map((f, i) => (
                  <li key={f.text} className="s-fact s-fact-in" style={{ animationDelay: `${1.4 + i * 0.16}s` }}>
                    <span>{f.text}</span>
                    <span className="s-fact-kinds">
                      {f.kinds.map((k) => (
                        <span key={k} className={`s-dotkind s-dotkind-${k}`} title={kindWord[k]} />
                      ))}
                    </span>
                  </li>
                ))}
              </ol>
            </article>

            {/* 3. the DM on X */}
            <article className="s-card s-dm s-in s-in-5" style={{ left: 892, top: 70, width: 284 }}>
              <header className="s-dm-head">
                <span className="s-dm-avatar">
                  <OparaxMark size={20} />
                </span>
                <div>
                  <strong>Oparax</strong>
                  <span>@oparax_ai</span>
                </div>
                <span className="s-dm-x">
                  <XGlyph size={15} />
                </span>
              </header>
              <div className="s-dm-body">
                <div className="s-bubble">
                  <small>{dmHead}</small>
                  <strong>{dmTitle}</strong>
                  <p>{dmFact}</p>
                  <span className="s-link">{dmLink.replace("https://", "")}</span>
                </div>
              </div>
              <div className="s-dm-compose">Start a new message</div>
            </article>
          </div>
        </div>
        <p className="s-caption">
          <span className="s-live-dot" aria-hidden="true" />
          Replay of three real reports from October 21, 2024. {PREVIEW_NOTE}
        </p>
      </div>
    </section>
  );
}

