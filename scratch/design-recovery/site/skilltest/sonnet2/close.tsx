import { Mail } from "lucide-react";
import { Avatar, GitHubMark, Logo, OparaxMark, PHMark, ReportChip, Stack, XMark } from "./ui";
import { clustered, HANDLE, hostOf, newest, when, sites, accounts } from "./data";

function Google() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 10.9z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

export function Close() {
  return (
    <section className="s2-sec s2-close" id="close">
      <div className="s2-wrap">
        <div className="s2-close-card s2-lift">
          <div className="s2-glow-in s2-glow-in-wide" />
          <div className="s2-close-l">
            <span className="s2-bot s2-bot-lg"><OparaxMark size={26} /></span>
            <h2>Your page is ready in minutes.</h2>
            <p>Sign up, give your X handle and one sentence. Oparax recommends up to ten websites and feeds and builds your page at oparax.ai/{HANDLE}.</p>
            <div className="s2-signups">
              <a className="s2-btn s2-btn-primary s2-btn-full" href="#close"><XMark size={13} /> Continue with X</a>
              <a className="s2-btn s2-btn-ghost s2-btn-full" href="#close"><Google /> Continue with Google</a>
              <a className="s2-btn s2-btn-ghost s2-btn-full" href="#close"><Mail size={14} /> Email and password</a>
            </div>
            <small className="s2-dim">7 days free, 300 watched X posts, no card.</small>
          </div>
          <div className="s2-close-r">
            <div className="s2-card s2-closepage">
              <div className="s2-card-h">
                <Avatar handle="@farzanmrz" size={18} /><b>oparax.ai/{HANDLE}</b>
                <span className="s2-chip h-green" style={{ marginLeft: "auto" }}><i className="s2-dot" /> Live</span>
              </div>
              {clustered.slice(0, 4).map((s) => (
                <article key={s.id} className="s2-story">
                  <div className="s2-story-top">
                    <Stack items={s.items.map((i) => ({ host: hostOf(i.url) }))} size={16} />
                    <span className="s2-pubs">{s.items.map((i) => i.publisher).join(", ")}</span>
                    <time>{when(newest(s).published_at)}</time>
                  </div>
                  <h4>{s.card.headline}</h4>
                  <div className="s2-story-chips"><ReportChip kind="article" n={s.items.length} /></div>
                </article>
              ))}
              <div className="s2-card-f s2-sources-strip">
                {sites.slice(0, 5).map((s) => <Logo key={s.id} host={s.host} size={18} round />)}
                {accounts.slice(0, 3).map((a) => <Avatar key={a.id} handle={a.handle} size={18} />)}
                <span className="s2-ghpill"><GitHubMark size={12} /></span>
                <span className="s2-ghpill s2-ph"><PHMark size={11} /></span>
              </div>
            </div>
          </div>
        </div>

        <footer className="s2-foot">
          <span><OparaxMark size={14} /> Oparax</span>
          <span className="s2-dim">Preview data from public sources, not from your agent.</span>
          <span className="s2-foot-r"><a href="#top">Privacy</a><a href="#top">Terms</a></span>
        </footer>
      </div>
    </section>
  );
}
