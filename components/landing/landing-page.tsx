"use client";

// Landing page — React port of the locked design reference
// (Oparax Landing v10). Components & tokens come from app/globals.css;
// page layout lives in app/landing.css. The header login form and the
// auth modals are wired to the real Supabase Server Actions.
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import "@/app/landing.css";
import {
  BlueskyIcon,
  FacebookIcon,
  GlobeIcon,
  InstagramIcon,
  LinkedInIcon,
  RedditIcon,
  ThreadsIcon,
  XIcon,
} from "@/components/icons";
import { AuthModal, type AuthView } from "@/components/landing/auth-modal";
import { OparaxMark } from "@/components/logo";
import { loginAction } from "@/lib/auth/modal-actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Inline header login (≥1280px). Mirrors the reference behavior: email
// format checked on blur, submit disabled until both fields are filled,
// in-button spinner while pending, server error shown under the password.
function HeaderLogin({ onForgot }: { onForgot: () => void }) {
  const [state, dispatch, pending] = useActionState(loginAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [lastState, setLastState] = useState(state);
  const [serverErrorHidden, setServerErrorHidden] = useState(false);

  // A fresh submission result re-shows the server error until the user edits
  // (state adjusted during render, not in an effect, per React guidance).
  if (state !== lastState) {
    setLastState(state);
    setServerErrorHidden(false);
  }

  const showServerError = Boolean(state.error) && !serverErrorHidden;

  return (
    <form
      className="hlogin"
      noValidate
      action={dispatch}
      onSubmit={(event) => {
        if (!EMAIL_RE.test(email.trim())) {
          event.preventDefault();
          setEmailError(true);
        }
      }}
    >
      <span className="hfield">
        <input
          className={`hl-input${emailError ? " invalid" : ""}`}
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="email"
          aria-label="Email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(false);
            setServerErrorHidden(true);
          }}
          onBlur={() => {
            if (email && !EMAIL_RE.test(email.trim())) setEmailError(true);
          }}
        />
        <div className={`ferr${emailError ? " show" : ""}`}>Email format incorrect</div>
      </span>
      <span className="pw-wrap">
        <input
          className={`hl-input${showServerError ? " invalid" : ""}`}
          type="password"
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          aria-label="Password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setServerErrorHidden(true);
          }}
        />
        <button className="forgot-link" type="button" onClick={onForgot}>
          Forgot?
        </button>
        <div className={`ferr${showServerError ? " show" : ""}`}>{state.error}</div>
      </span>
      <button
        className={`btn btn-primary${pending ? " loading" : ""}`}
        type="submit"
        disabled={!email.trim() || !password.trim()}
      >
        <span className="ld" />
        Log in
      </button>
    </form>
  );
}

// The static agent-card demo from the reference hero.
function AgentCardDemo() {
  return (
    <div className="desk-card">
      <div className="card-chrome">
        <XIcon width={14} height={14} fill="#FFFFFF" />
        Oparax Agent
      </div>

      <div className="card-body">
        <div className="top-row">
          <div className="ffield-wrap">
            <span className="flabel">Workflow name</span>
            <div className="ffield">Premier League Desk</div>
          </div>
          <div className="ffield-wrap">
            <span className="flabel">X accounts (3 / 20)</span>
            <div className="badge-row">
              <span className="wbadge">@FabrizioRomano</span>
              <span className="wbadge">@David_Ornstein</span>
              <span className="wbadge">@SkySportsPL</span>
            </div>
          </div>
        </div>

        <div className="ffield-row">
          <div className="ffield-wrap">
            <span className="flabel">Scanning instructions</span>
            <div className="ffield">
              Confirmed transfer news only — fees, medicals, announcements.
            </div>
          </div>
          <div className="ffield-wrap">
            <span className="flabel">Drafting instructions</span>
            <div className="ffield">First person, punchy, no hashtags — sound like me.</div>
          </div>
        </div>

        <div className="draft-divider">
          <span className="chip">
            <span className="dot blink" />
            News items
          </span>
        </div>

        <div className="news-list">
          <div className="news-item">
            <p>
              Midfielder agrees personal terms on record £90m move — medical booked for Thursday.
            </p>
            <div className="srcs">
              <span>
                <b className="arr">↗</b>FabrizioRomano
              </span>
              <span>
                <b className="arr">↗</b>David_Ornstein
              </span>
              <span className="when">Today · 14:32</span>
            </div>
          </div>
          <div className="news-item">
            <p>
              Loan deal for England winger collapses after medical flags — clubs back at the table.
            </p>
            <div className="srcs">
              <span>
                <b className="arr">↗</b>David_Ornstein
              </span>
              <span className="when">Today · 12:18</span>
            </div>
          </div>
          <div className="news-item">
            <p>
              Veteran keeper signs one-year extension, announcement expected before Friday&apos;s
              match.
            </p>
            <div className="srcs">
              <span>
                <b className="arr">↗</b>SkySportsPL
              </span>
              <span>
                <b className="arr">↗</b>FabrizioRomano
              </span>
              <span className="when">Yesterday · 21:47</span>
            </div>
          </div>
        </div>

        <div className="draft-divider">
          <span className="chip">
            <span className="dot blink" />
            Drafted in your voice
          </span>
        </div>

        <div className="xpost">
          <p className="xpost-body">
            Here we go — personal terms agreed on the £90m deal. Medical locked in for Thursday,
            full agreement between clubs reached tonight. More to follow.
            <span className="caret" />
          </p>
          <div className="xpost-foot">
            <XIcon width={15} height={15} fill="#FFFFFF" />
            <span className="chars">
              <b>231</b> / 280
            </span>
            <span className="spacer" />
            <button className="btn btn-secondary btn-sm" type="button">
              Edit
            </button>
            <button className="btn btn-primary btn-sm" type="button">
              Post
            </button>
          </div>
        </div>
      </div>

      <div className="card-soon">
        <span className="soon-label">Coming soon:</span>
        <GlobeIcon
          width={15}
          height={15}
          style={{
            color: "#8FBDE8",
          }}
        />
        <RedditIcon width={15} height={15} fill="#FF4500" />
        <BlueskyIcon width={15} height={15} fill="#1185FE" />
        <ThreadsIcon width={15} height={15} fill="#F2F5F8" />
        <InstagramIcon width={15} height={15} fill="#FF0069" />
        <FacebookIcon width={15} height={15} fill="#0866FF" />
        <LinkedInIcon width={15} height={15} />
      </div>
    </div>
  );
}

export function LandingPage({
  initialView = null,
  initialError,
  initialMessage,
  tokenHash,
  tokenType,
}: {
  initialView?: AuthView | null;
  initialError?: string;
  initialMessage?: string;
  tokenHash?: string;
  tokenType?: "recovery";
} = {}) {
  const [authView, setAuthView] = useState<AuthView | null>(initialView);

  // When the modal was auto-opened via ?auth=... (from the /login etc.
  // redirects), strip those params from the URL so a refresh or close leaves
  // a clean address and the seeded message isn't shown again.
  useEffect(() => {
    if (initialView && typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [
    initialView,
  ]);

  const openAuth = (view: AuthView) => () => setAuthView(view);

  return (
    <div className="landing">
      <header className="header">
        <div className="shell">
          <Link className="brand" href="/" aria-label="Oparax home">
            <OparaxMark width={26} height={26} />
            <span>Oparax</span>
          </Link>
          <div className="auth-zone">
            <HeaderLogin onForgot={openAuth("forgot")} />
            <button
              className="btn btn-primary login-modal-btn"
              type="button"
              onClick={openAuth("login")}
            >
              Log in
            </button>
            <button className="btn btn-secondary" type="button" onClick={openAuth("signup")}>
              Sign up
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero shell">
          <div className="intro">
            <span className="kicker">
              <span className="dot blink" />
              AI news desk for people who live on X
            </span>
            <h1>
              Be first to <span className="hl">every story.</span>
            </h1>
            <p className="sub">
              Oparax watches the accounts and sources you can&apos;t keep up with, surfaces breaking
              stories <b>the moment they land</b>, and drafts posts in your voice — so you&apos;re
              first, not buried in forty open tabs.
            </p>
          </div>

          <AgentCardDemo />
        </section>
      </main>

      <footer className="footer">
        <div className="shell">
          <div className="left">
            <OparaxMark width={17} height={17} />
            <span>© 2026 Oparax</span>
          </div>
          <nav>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms &amp; Conditions</a>
            <a href="#">Contact</a>
          </nav>
        </div>
      </footer>

      <AuthModal
        view={authView}
        initialError={initialError}
        initialMessage={initialMessage}
        tokenHash={tokenHash}
        tokenType={tokenType}
        onClose={() => setAuthView(null)}
        onChangeView={setAuthView}
      />
    </div>
  );
}
