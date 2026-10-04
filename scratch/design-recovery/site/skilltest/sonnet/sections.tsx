import { ArrowRight, Bell } from "lucide-react";
import { board, clock, day, freeWeek, hostOf, ledger, plans, POOL_MAX, type Kind } from "./data";
import { Ledger } from "./ledger";
import { Cover, FeedGlyph, KindGlyph, OparaxMark, SiteIcon, XGlyph } from "./marks";
import { Spot } from "./spot";
import { ThemeToggle } from "./theme-toggle";

export function Nav() {
  return (
    <header className="s-nav">
      <div className="s-wrap s-nav-in">
        <a className="s-brand" href="#top" aria-label="Oparax">
          <OparaxMark size={22} />
          <span>oparax</span>
        </a>
        <nav className="s-nav-links" aria-label="Page">
          <a href="#sources">Sources</a>
          <a href="#stories">Stories</a>
          <a href="#alerts">Alerts</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="s-nav-actions">
          <ThemeToggle />
          <a className="s-nav-login" href="/next/login">
            Log in
          </a>
          <a className="s-btn s-btn-primary s-btn-sm" href="/next/signup">
            Sign up
          </a>
        </div>
      </div>
    </header>
  );
}

export function Stories() {
  return (
    <section className="s-sec" id="stories">
      <div className="s-wrap">
        <div className="s-head">
          <span className="s-eyebrow">Stories</span>
          <h2 className="s-h2">
            Every line comes with
            <br />
            <span className="s-dim">the words behind it.</span>
          </h2>
          <p>
            Reports about the same event are joined into one story. Each line points to the exact quote it came from, in every
            report that says it.
          </p>
        </div>
        <Ledger />
      </div>
    </section>
  );
}

const commands = [
  { word: "Start alerts", tone: "brand" },
  { word: "PAUSE", tone: "caution" },
  { word: "RESUME", tone: "ok" },
  { word: "STOP", tone: "error" },
];

function BoardCard({ story, className, active }: { story: (typeof board)["current"]; className: string; active?: boolean }) {
  const first = story.items[0];
  const kinds = Array.from(new Set(story.items.map((i) => (i.kind === "post" ? "post" : "article")))) as Kind[];
  return (
    <div className={`s-bc ${className}`} data-active={active ? "1" : "0"}>
      {!active && first.image ? <Cover src={first.image} className="s-bc-cover" /> : null}
      <div className="s-bc-body">
        <div className="s-bc-meta">
          {kinds.map((k) => (
            <span key={k} className={`s-chip s-chip-${k}`}>
              <KindGlyph kind={k} size={12} />
              {story.items.length} {story.items.length === 1 ? "Article" : "Articles"}
            </span>
          ))}
          <time>
            {day(first.published_at)}, {clock(first.published_at)}
          </time>
        </div>
        <h3>{story.card.headline}</h3>
        <p>{story.card.facts[0].text}</p>
        <div className="s-bc-foot">
          {story.items.map((i) => (
            <SiteIcon key={i.id} host={hostOf(i.url)} size={16} />
          ))}
          <span>{story.items.map((i) => i.publisher).join(", ")}</span>
        </div>
      </div>
    </div>
  );
}

export function Alerts() {
  const lines = ledger.dm.split("\n\n");
  const head = lines[0];
  const [title, fact, link] = lines[1].split("\n");
  return (
    <section className="s-sec" id="alerts">
      <div className="s-wrap s-alerts">
        <div className="s-alerts-copy">
          <span className="s-eyebrow">Alerts</span>
          <h2 className="s-h2">
            One DM per story.
            <br />
            <span className="s-dim">Never twice.</span>
          </h2>
          <p>Later reports improve the story on your page. They never message you again.</p>
          <div className="s-cmds">
            <span className="s-mono s-t4">Send from your page&apos;s own X account</span>
            <ul>
              {commands.map((c) => (
                <li key={c.word} className={`s-cmd s-cmd-${c.tone}`}>
                  {c.word}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="s-thread-stage">
          <div className="s-thread-light" aria-hidden="true" />
          {/* the page the DM links to, with other real stories around it */}
          <div className="s-board" aria-hidden="true">
            <BoardCard story={board.before} className="s-bc-1" />
            <BoardCard story={board.current} className="s-bc-2" active />
            <BoardCard story={board.after} className="s-bc-3" />
          </div>
          <article className="s-card s-thread">
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
            <div className="s-thread-body">
              <div className="s-bubble s-bubble-me">Start alerts</div>
              <div className="s-bubble">
                <small>{head}</small>
                <strong>{title}</strong>
                <p>{fact}</p>
                <span className="s-link">{link.replace("https://", "")}</span>
              </div>
            </div>
            <div className="s-dm-compose">Start a new message</div>
          </article>
        </div>
      </div>
    </section>
  );
}

const slots = Array.from({ length: 96 });

export function Pricing() {
  return (
    <section className="s-sec" id="pricing">
      <div className="s-wrap">
        <div className="s-head">
          <span className="s-eyebrow">Pricing</span>
          <h2 className="s-h2">
            Pick your pace.
            <br />
            <span className="s-dim">Choose how much of X to watch.</span>
          </h2>
          <p>Every plan includes your story feed and unlimited sites and feeds. Plans differ in how many X posts are watched and how often you hear about them.</p>
        </div>

        <div className="s-free">
          <span className="s-pill-free">Free week</span>
          <div className="s-seg" aria-hidden="true">
            {Array.from({ length: freeWeek.days }).map((_, i) => (
              <i key={i} />
            ))}
          </div>
          <span>
            {freeWeek.days} days, {freeWeek.posts} watched X posts, no card
          </span>
          <a className="s-btn s-btn-ghost s-btn-sm" href="/next/signup">
            Start free <ArrowRight size={14} />
          </a>
        </div>

        <div className="s-plans">
          {plans.map((p) => (
            <Spot key={p.id} className={`s-tile s-plan s-plan-${p.id}`}>
              <div className="s-plan-name s-mono">{p.name}</div>
              <div className="s-price">
                <b>${p.price}</b>
                <span>a month</span>
              </div>

              <div className="s-plan-block">
                <div className="s-plan-label">
                  <span className="s-kind s-kind-post" aria-hidden="true">
                    <XGlyph size={12} />
                  </span>
                  <span>Watched X posts</span>
                  <b>{p.posts.toLocaleString("en-US")}</b>
                </div>
                <div className="s-meter">
                  <i style={{ width: `${Math.max(2, (p.posts / POOL_MAX) * 100)}%` }} />
                </div>
              </div>

              <div className="s-plan-block">
                <div className="s-plan-label">
                  <span className="s-kind s-kind-alert" aria-hidden="true">
                    <Bell size={12} strokeWidth={2} />
                  </span>
                  <span>Alerts on X</span>
                </div>
                <div className={`s-slots s-slots-${p.cadence}`} aria-hidden="true">
                  {slots.map((_, i) => (
                    <i key={i} data-on={p.cadence === "fifteen" ? "1" : i === 0 ? "1" : "0"} />
                  ))}
                </div>
                <small>{p.cadenceWord}</small>
              </div>

              <div className="s-plan-block s-plan-foot">
                <div className="s-plan-label">
                  <span className="s-kind s-kind-article" aria-hidden="true">
                    <FeedGlyph size={12} />
                  </span>
                  <span>Sites and feeds</span>
                  <b>Unlimited</b>
                </div>
                <div className="s-favs" aria-hidden="true">
                  {["vercel.com", "huggingface.co", "simonwillison.net", "latent.space", "mistral.ai", "interconnects.ai"].map((h) => (
                    <SiteIcon key={h} host={h} size={22} />
                  ))}
                </div>
              </div>
            </Spot>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Closer() {
  return (
    <section className="s-closer">
      <div className="s-closer-light" aria-hidden="true" />
      <div className="s-wrap s-closer-in">
        <h2 className="s-h2 s-h2-center">
          Write one sentence.
          <br />
          <span className="s-h1-accent">Hear about it on X.</span>
        </h2>
        <div className="s-cta-row s-cta-center">
          <a className="s-btn s-btn-primary s-btn-lg" href="/next/signup">
            Sign up <ArrowRight size={16} strokeWidth={2} />
          </a>
          <span className="s-cta-note">Free for seven days. No card.</span>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="s-footer">
      <div className="s-wrap s-footer-in">
        <a className="s-brand" href="#top" aria-label="Oparax">
          <OparaxMark size={20} />
          <span>oparax</span>
        </a>
        <nav aria-label="Legal">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
