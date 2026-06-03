"use client"

import { useEffect, useRef, useState } from "react"

import "@/app/landing.css"
import { AuthModal, type AuthView } from "@/components/landing/auth-modal"

export function LandingPage({
  initialView = null,
  initialError,
  initialMessage,
}: {
  initialView?: AuthView | null
  initialError?: string
  initialMessage?: string
} = {}) {
  const [authView, setAuthView] = useState<AuthView | null>(initialView)
  const rootRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const heroGlowRef = useRef<HTMLDivElement>(null)

  // When the modal was auto-opened via ?auth=... (from the /login etc. redirects),
  // strip those params from the URL so a refresh or close leaves a clean address
  // and the seeded message isn't shown again.
  useEffect(() => {
    if (initialView && typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [initialView])

  // Reveal-on-scroll + nav border + hero glow (ported from the design script).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"))
    const revealAll = () => els.forEach((el) => el.classList.add("in"))

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    let observer: IntersectionObserver | null = null
    if (!("IntersectionObserver" in window) || prefersReduced) {
      revealAll()
    } else {
      const vh = window.innerHeight || 800
      els.forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add("in")
      })
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in")
              observer?.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      )
      els.forEach((el) => {
        if (!el.classList.contains("in")) observer?.observe(el)
      })
    }

    // Safety net so content is never stuck hidden.
    const safety = window.setTimeout(revealAll, 1400)

    // Hero glow on.
    heroGlowRef.current?.classList.add("on")

    // Nav border on scroll.
    const onScroll = () => {
      navRef.current?.classList.toggle("scrolled", window.scrollY > 12)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => {
      observer?.disconnect()
      window.clearTimeout(safety)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  const openAuth = (view: AuthView) => () => setAuthView(view)

  return (
    <div className="lp" ref={rootRef} id="top">
      {/* ===================== NAV ===================== */}
      <header className="nav" ref={navRef}>
        <div className="wrap nav-inner">
          <a className="brand" href="#top" aria-label="Oparax home">
            <span className="mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 2 L22 21 L2 21 Z" fill="var(--accent)" />
              </svg>
            </span>
            <span>Oparax</span>
          </a>
          <nav className="nav-links">
            <a className="navlink" href="#how">How it works</a>
            <a className="navlink" href="#features">Features</a>
            <a className="navlink" href="#roadmap">Roadmap</a>
          </nav>
          <div className="nav-cta">
            <button className="login" type="button" onClick={openAuth("login")}>
              Log in
            </button>
            <button
              className="btn btn-accent btn-sm"
              type="button"
              onClick={openAuth("signup")}
            >
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="hero">
        <div className="hero-glow" ref={heroGlowRef} />
        <div className="grid-bg" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrow-wrap reveal">
              <span className="eyebrow">AI news desk for people who live on X</span>
            </div>
            <h1 className="reveal d1">
              Be first to <span className="hl">every story.</span>
            </h1>
            <p className="sub reveal d2">
              Oparax watches the accounts and sources you can&apos;t keep up
              with, surfaces breaking stories <strong>the moment they land</strong>,
              and drafts posts in your voice — so you&apos;re first, not buried in
              forty open tabs.
            </p>
            <div className="hero-actions reveal d3">
              <button
                className="btn btn-accent"
                type="button"
                onClick={openAuth("signup")}
              >
                Sign up free
              </button>
              <a className="btn btn-ghost" href="#how">See how it works</a>
            </div>
            <div className="hero-note reveal d3">
              <span className="dot" /> Built with a pro reporter who turns 400k
              followers into real income.
            </div>
          </div>

          {/* product mock */}
          <div className="mock reveal d2" aria-label="Oparax agent run preview">
            <div className="mock-bar">
              <span className="dots"><i /><i /><i /></span>
              <span className="title">oparax · agent run</span>
              <span className="cost">$0.015 / run</span>
            </div>
            <div className="mock-body">
              <div className="m-head">
                <span className="m-agent">Premier League Desk</span>
                <span className="m-live"><span className="pulse" /> scanning</span>
              </div>
              <div className="m-watch">
                <span className="lbl">watching</span>
                <span className="chip">
                  <span className="av" style={{ background: "oklch(0.7 0.15 25)" }} />@FabrizioRomano
                </span>
                <span className="chip">
                  <span className="av" style={{ background: "oklch(0.7 0.15 145)" }} />@David_Ornstein
                </span>
                <span className="chip">
                  <span className="av" style={{ background: "oklch(0.7 0.15 270)" }} />@SkySports
                </span>
                <span
                  className="chip"
                  style={{
                    color: "var(--faint)",
                    background: "oklch(1 0 0 / 0.04)",
                    borderColor: "var(--lp-border)",
                  }}
                >
                  +17 more
                </span>
              </div>
              <div className="m-divider" />
              <div className="story">
                <div className="row">
                  <span className="rank">★ breaking · top story</span>
                </div>
                <div className="ttl">
                  Midfielder agrees personal terms ahead of a record £90m move —
                  medical booked for Thursday.
                </div>
                <div className="srcs">
                  <span className="src">FabrizioRomano</span>
                  <span className="src">David_Ornstein</span>
                  <span className="src">3 sources clustered</span>
                </div>
              </div>
              <div className="flowdown">drafted in your voice</div>
              <div className="draft">
                <div className="who">
                  <span className="av" />
                  <span>
                    <span className="name">You</span>{" "}
                    <span className="at">@yourhandle</span>
                  </span>
                </div>
                <div className="txt">
                  🚨 Here we go — personal terms <b>agreed</b> on the £90m deal.
                  Medical locked in for Thursday, full agreement between clubs
                  reached tonight. More to follow.
                </div>
                <div className="foot">
                  <span className="count"><b>231</b> / 280</span>
                  <span className="acts">
                    <button className="mini" type="button">Edit</button>
                    <button className="mini post" type="button">Post to X</button>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* proof strip */}
        <div className="proof reveal">
          <div className="wrap proof-inner">
            <p className="quote">
              &quot;I was monitoring <b>40+ accounts by hand</b> to catch a
              transfer before anyone else. Miss it by two minutes and the post is
              worthless.&quot;
            </p>
            <div className="stats">
              <div className="stat"><div className="n">400k+</div><div className="l">followers reached</div></div>
              <div className="stat"><div className="n">40+</div><div className="l">sources, one feed</div></div>
              <div className="stat"><div className="n">~2 min</div><div className="l">is the whole game</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PROBLEM ===================== */}
      <section className="section">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">The job behind the job</span>
            <h2>Being first is the work. The work is brutal.</h2>
            <p>
              If you break news on X, your edge is minutes — and you spend your
              whole day fighting to keep it.
            </p>
          </div>
          <div className="prob-grid">
            <div className="prob reveal">
              <div className="ico">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <h3>Forty tabs, refreshing</h3>
              <p>Dozens of accounts and sources, watched by hand, all day. One blink and a competitor beats you to it.</p>
            </div>
            <div className="prob reveal d1">
              <div className="ico">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <h3>The clock is the enemy</h3>
              <p>By the time you&apos;ve read, verified and written it up, the story has already broken somewhere else.</p>
            </div>
            <div className="prob reveal d2">
              <div className="ico">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 19V5M4 19h16M8 16l4-6 3 4 5-7" />
                </svg>
              </div>
              <h3>Voice doesn&apos;t scale</h3>
              <p>Posting fast and sounding like you are at odds. Generic tools write generic posts your audience scrolls past.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="section tinted" id="how">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">The loop</span>
            <h2>Set it up once. It runs the desk for you.</h2>
            <p>
              Oparax turns a full day of manual monitoring into a single agent you
              configure, run, and post from.
            </p>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="num"><span className="bar" /></div>
              <h3>Connect &amp; configure</h3>
              <p>Link your X account, pick the handles and sources to watch, and teach it the way you write.</p>
            </div>
            <div className="step reveal d1">
              <div className="num"><span className="bar" /></div>
              <h3>It watches everything</h3>
              <p>A Grok-powered scan reads across every source and clusters the noise into distinct, ranked stories.</p>
            </div>
            <div className="step reveal d2">
              <div className="num"><span className="bar" /></div>
              <h3>Drafts in your voice</h3>
              <p>Every story comes back as a ready-to-post draft — weighted to 280 chars, no markdown, no junk links.</p>
              <span className="tag">live now</span>
            </div>
            <div className="step reveal d3">
              <div className="num"><span className="bar" /></div>
              <h3>You post, in one tap</h3>
              <p>Review, tweak the wording, and post a real tweet straight from Oparax. You stay in control.</p>
              <span className="tag soon">auto-post · soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="section" id="features">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">What&apos;s under the hood</span>
            <h2>A real intelligence layer, not another scheduler.</h2>
          </div>
          <div className="feat-grid">
            <div className="feat reveal">
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <div>
                <h3>Source monitoring</h3>
                <p>Track up to 20 handles per agent today. Cluster what they all say into one signal instead of twenty notifications.</p>
              </div>
            </div>
            <div className="feat reveal d1">
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 17l5-5 4 3 8-9" />
                  <path d="M21 6v5h-5" />
                </svg>
              </div>
              <div>
                <h3>Newsworthiness ranking</h3>
                <p>Stories are scored and ordered, so the one that actually matters is at the top of the feed — not lost in it.</p>
              </div>
            </div>
            <div className="feat reveal">
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </div>
              <div>
                <h3>Drafts in your voice</h3>
                <p>Trained on how you write. Output is tweet-ready: under 280 weighted chars, clean of markdown and raw URLs.</p>
              </div>
            </div>
            <div className="feat reveal d1">
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2v20M2 12h20" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <div>
                <h3>Real posting to X</h3>
                <p>Connect once and post the final tweet straight from Oparax. No copy-paste, no second app.</p>
              </div>
            </div>
            <div className="feat span2 reveal">
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 7h18M3 12h18M3 17h12" />
                </svg>
              </div>
              <div>
                <h3>Cost you can actually see</h3>
                <p>One scan, one price. Every agent run shows its exact cost up front — typically a cent and a half — so automating your desk never becomes a surprise bill.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== ROADMAP ===================== */}
      <section className="section tinted" id="roadmap">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Where this is going</span>
            <h2>One desk today. Every feed, soon.</h2>
            <p>
              Oparax starts on X because that&apos;s where speed is decided. Next,
              your agent watches more sources — and posts the story everywhere your
              audience is, automatically.
            </p>
          </div>

          <div className="channels reveal">
            <div className="ch-agent">
              <span className="av">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2 L21 19 L3 19 Z" />
                </svg>
              </span>
              <span className="nm">Your agent</span>
              <span className="role">drafts &amp; posts</span>
            </div>
            <div className="ch-flow">
              <div className="flow-lbl">publishes the story to</div>
              <div className="ch-pills">
                <span className="plat live">
                  <span className="glyph" style={{ background: "#000" }}>
                    <svg viewBox="0 0 24 24" fill="#fff">
                      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-6.8l-5.3-6.9L5.1 22H2l8.1-9.3L1.5 2h6.9l4.8 6.4L18.9 2Zm-1.2 18h1.9L7.3 4H5.3l12.4 16Z" />
                    </svg>
                  </span>
                  X <span className="st">live now</span>
                </span>
                <span className="plat soon">
                  <span className="glyph" style={{ background: "linear-gradient(135deg,#feda75,#d62976,#962fbf)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
                    </svg>
                  </span>
                  Instagram <span className="st">soon</span>
                </span>
                <span className="plat soon">
                  <span className="glyph" style={{ background: "#1877f2" }}>
                    <svg viewBox="0 0 24 24" fill="#fff">
                      <path d="M14 9V7.5c0-.7.3-1 1-1h1.5V4H14c-2 0-3 1.2-3 3v2H9v2.5h2V20h2.5v-6.5H16l.5-2.5H13.5V9Z" />
                    </svg>
                  </span>
                  Facebook <span className="st">soon</span>
                </span>
                <span className="plat soon">
                  <span className="glyph" style={{ background: "#000" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 21c4.5 0 7-2.6 7-6.4 0-2.6-1.7-4.4-4-4.6-.4-2-1.8-3-3.7-3-2 0-3.4 1.2-3.6 3M8 14c0-1.8 1.5-3 3.7-3 3 0 4 1.8 4 3.4 0 1.5-1.2 2.6-2.8 2.6-1.4 0-2.4-.8-2.4-2 0-1 .8-1.8 2-1.8s1.8.7 1.8 1.5" />
                    </svg>
                  </span>
                  Threads <span className="st">soon</span>
                </span>
                <span className="plat soon">
                  <span className="glyph" style={{ background: "#25d366" }}>
                    <svg viewBox="0 0 24 24" fill="#fff">
                      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 0 1 5.9 10.8l-.3.4.6 2.2-2.3-.6-.4.2A7 7 0 1 1 12 5Zm-2.6 3.3c-.2 0-.5 0-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.2.2 1.8 2.9 4.5 3.9 2.2.8 2.7.7 3.2.6.6-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.2-1.2l-.6-.4c-.3-.1-1.6-.8-1.8-.9-.3-.1-.4-.1-.6.2l-.8 1c-.2.2-.3.2-.6.1s-1.2-.5-2.3-1.4c-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5.3-.5v-.5c0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4Z" />
                    </svg>
                  </span>
                  WhatsApp <span className="st">soon</span>
                </span>
                <span className="plat soon">
                  <span className="glyph" style={{ background: "#0085ff" }}>
                    <svg viewBox="0 0 24 24" fill="#fff">
                      <path d="M12 11c-1.3-2.5-4.8-7-8-7C2 4 2 6.6 2 8c0 3 2.3 4.6 4 5 .9.2 1 .4 0 .6-2 .4-3 1.6-2 3.4 1.4 2.4 4.6.6 6-2 .5-.9 1-2 2-3.5 1 1.5 1.5 2.6 2 3.5 1.4 2.6 4.6 4.4 6 2 1-1.8 0-3-2-3.4-1-.2-.9-.4 0-.6 1.7-.4 4-2 4-5 0-1.4 0-4-2-4-3.2 0-6.7 4.5-8 7Z" />
                    </svg>
                  </span>
                  Bluesky <span className="st">soon</span>
                </span>
              </div>
            </div>
          </div>
          <div className="road">
            <div className="road-line">
              <div className="road-item now reveal">
                <span className="dot" />
                <div className="ph">Live now</div>
                <h3>The X loop, end to end</h3>
                <p>Monitor handles, surface clustered stories, draft in your voice, and post a real tweet — all in one run.</p>
              </div>
              <div className="road-item next reveal d1">
                <span className="dot" />
                <div className="ph">Next up</div>
                <h3>More sources, beyond X</h3>
                <p>Your agent also watches news sites, RSS feeds, and other social platforms — so nothing breaks without you knowing first.</p>
              </div>
            </div>
            <div className="road-line">
              <div className="road-item next reveal d1">
                <span className="dot" />
                <div className="ph">On the way</div>
                <h3>Auto-post to every network</h3>
                <p>Connect Instagram, Facebook, Threads, WhatsApp, and Bluesky. Approve once and your agent publishes everywhere — reformatted to fit each feed.</p>
              </div>
              <div className="road-item reveal d2">
                <span className="dot" />
                <div className="ph">The vision</div>
                <h3>Your whole content engine</h3>
                <p>From breaking-news desk to a full pipeline that learns your style and runs your social presence end to end.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="finalcta" id="access">
        <div className="glow" />
        <div className="wrap">
          <h2 className="reveal">
            Stop watching the feed.<br />Start beating it.
          </h2>
          <p className="reveal d1">
            Create your agent in minutes. Watch the sources that matter, draft in
            your voice, and post the moment a story breaks.
          </p>
          <div className="actions reveal d2">
            <button
              className="btn btn-accent"
              type="button"
              onClick={openAuth("signup")}
            >
              Sign up free
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={openAuth("login")}
            >
              Log in
            </button>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="footer">
        <div className="wrap footer-inner">
          <a className="brand" href="#top">
            <span className="mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 2 L22 21 L2 21 Z" fill="var(--accent)" />
              </svg>
            </span>
            <span>Oparax</span>
          </a>
          <div className="flinks">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#roadmap">Roadmap</a>
            <button className="login" type="button" onClick={openAuth("login")}>
              Log in
            </button>
          </div>
          <div className="legal">© 2026 Oparax. Be first.</div>
        </div>
      </footer>

      <AuthModal
        view={authView}
        initialError={initialError}
        initialMessage={initialMessage}
        onClose={() => setAuthView(null)}
        onChangeView={(view) => setAuthView(view)}
      />
    </div>
  )
}
