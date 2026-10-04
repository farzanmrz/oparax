import { Layers } from "lucide-react";
import { BotAvatar } from "@/pro/shared/brand";
import { XLogo } from "@/pro/shared/brand";
import { Dot, GitHubMark, KindChip, MarkStack, ReportMark, SiteIcon, WeekBars } from "@/next/council/marks";
import { Facts } from "./facts";
import { Checking, Img, Nav, SignUpButton, SourceChip } from "./parts";
import { digests, hostOf, items, parseDm, recentItems as r, sol, solDm, week, weekTotal, when } from "./data";
import { chosenAccounts, chosenSites } from "./data";

const rows = [r.olmoCore, r.vercelMai, r.vercelAgent, r.latentSol, r.simonSol, r.mistralMunich, items.nextPost];

export function Hero() {
  const dm = parseDm(solDm).entries[0];
  return (
    <section className="s3-screen" id="top">
      <div className="s3-light" style={{ background: "radial-gradient(60% 55% at 72% 38%, var(--s3-glow), transparent 70%), radial-gradient(40% 40% at 8% 90%, var(--s3-glow-2), transparent 70%)" }} />
      <div className="s3-wrap">
        <Nav />
        <div style={{ display: "grid", gridTemplateColumns: "500px 800px", columnGap: 44, marginTop: 34 }}>
          <div>
            <span className="s3-chip ok lg" style={{ gap: 8 }}>
              <Dot tone="ok" pulse />
              Live, watching {chosenSites.length} sites and feeds, {chosenAccounts.length} X accounts
            </span>
            <h1 className="s3-h1" style={{ marginTop: 22 }}>
              The wide internet, brought to you on X.
            </h1>
            <p className="s3-lede" style={{ marginTop: 20, maxWidth: 460 }}>
              Say what you cover in one sentence. Oparax reads the sources that fit, joins reports of one event into a single story with every line cited, and sends you one DM.
            </p>
            <div className="s3-row" style={{ marginTop: 26, gap: 12 }}>
              <SignUpButton />
              <a href="#stories" className="s3-btn ghost">See a story</a>
            </div>
            <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 440 }}>
              <SourceChip kind="x" large />
              <SourceChip kind="site" large />
              <SourceChip kind="rss" large />
              <SourceChip kind="github" large />
              <SourceChip kind="ph" large />
            </div>
            <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 440 }}>
              <div className="s3-tile">
                <span className="s3-label">Checking</span>
                <div className="s3-row" style={{ marginTop: 6, fontSize: 22, fontWeight: 600 }}>
                  <span className="s3-spin" /> 1
                </div>
              </div>
              <div className="s3-tile">
                <span className="s3-label">Failed</span>
                <div className="s3-row" style={{ marginTop: 6, fontSize: 22, fontWeight: 600, color: "var(--error)" }}>
                  <Dot tone="error" /> 1
                </div>
              </div>
              <div className="s3-tile" style={{ gridColumn: "1 / -1" }}>
                <div className="s3-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <span className="s3-label">Reports in the last 7 days</span>
                    <div style={{ marginTop: 4, fontSize: 22, fontWeight: 600 }}>{weekTotal}</div>
                  </div>
                  <WeekBars week={week} height={40} className="w-[150px]" />
                </div>
              </div>
            </div>
          </div>

          {/* The pipeline: reports in, one story, one DM. */}
          <div style={{ position: "relative", height: 730 }}>
            <div className="s3-window" style={{ position: "absolute", left: 0, top: 70, width: 340 }}>
              <div className="s3-bar">
                <span style={{ fontWeight: 600 }}>Reports in</span>
                <span className="s3-count">{rows.length + 1}</span>
                              </div>
              <Checking>Checking 1 item against your sentence</Checking>
              {rows.map((it) => (
                <div key={it.id} style={{ padding: "9px 14px", borderBottom: "1px solid var(--line-soft)" }}>
                  <div className="s3-row" style={{ gap: 8 }}>
                    <ReportMark item={it} size={16} className={it.kind === "post" ? "" : "rounded-[4px]"} />
                    <span style={{ fontSize: 12.5, color: "var(--t2)", fontWeight: 500 }}>{it.publisher}</span>
                    <KindChip kind={it.kind} className="!h-[18px] !text-[10.5px] !px-1.5" />
                                      </div>
                  <div className="s3-trunc" style={{ marginTop: 3, paddingLeft: 24, fontSize: 12.5, color: "var(--t3)", width: 280 }}>{it.title}</div>
                </div>
              ))}
              <div style={{ padding: "9px 14px" }}>
                <div className="s3-row" style={{ gap: 8 }}>
                  <GitHubMark className="size-4 text-[var(--kind-github)]" />
                  <span style={{ fontSize: 12.5, color: "var(--t2)", fontWeight: 500 }}>{digests[0].name}</span>
                  <KindChip kind="github" className="!h-[18px] !text-[10.5px] !px-1.5" />
                </div>
                <div className="s3-trunc" style={{ marginTop: 3, paddingLeft: 24, fontSize: 12.5, color: "var(--t3)", width: 280 }}>{digests[0].description}</div>
              </div>
            </div>

            {/* The story: the big moment, with the other report peeking behind it. */}
            <div style={{ position: "absolute", left: 300, top: 0, width: 500 }}>
              <div className="s3-card" style={{ position: "absolute", inset: 0, transform: "translate(14px, 14px) scale(0.985)", transformOrigin: "top left", opacity: 0.75, borderRadius: 16, height: 560 }} />
              <div className="s3-card" style={{ position: "absolute", inset: 0, transform: "translate(28px, 28px) scale(0.97)", transformOrigin: "top left", opacity: 0.5, borderRadius: 16, height: 560 }} />
              <article className="s3-window" style={{ position: "relative", borderRadius: 16, boxShadow: "var(--window-shadow), var(--top-light), 0 0 80px -20px var(--s3-glow)" }}>
                <div style={{ position: "relative", height: 210 }}>
                  <Img src={sol.card.image!} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgb(0 0 0 / 0.35))" }} />
                  <span className="s3-chip brand" style={{ position: "absolute", left: 14, top: 14, background: "rgb(10 12 16 / 0.72)", color: "#fff", backdropFilter: "blur(6px)" }}>
                    <Layers className="size-3" /> 2 reports, one story
                  </span>
                </div>
                <div style={{ padding: "16px 20px 18px" }}>
                  <div className="s3-row" style={{ gap: 8 }}>
                    <span className="s3-chip article">2 Articles</span>
                    <span className="s3-chip">5 facts</span>
                    <span className="s3-mono s3-num" style={{ marginLeft: "auto", fontSize: 11, color: "var(--t4)" }}>Sep 30, 05:53 UTC</span>
                  </div>
                  <h3 style={{ margin: "12px 0 12px", fontSize: 24, lineHeight: 1.18, letterSpacing: "-0.02em", fontWeight: 600, color: "var(--t1)" }}>{sol.card.headline}</h3>
                  <Facts story={sol} max={2} />
                  <div className="s3-row" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--t3)" }}>
                    <MarkStack items={sol.items} size={20} />
                    Latent Space, Simon Willison
                  </div>
                </div>
              </article>
            </div>

            {/* The DM. */}
            <div className="s3-window" style={{ position: "absolute", left: 450, top: 500, width: 350, borderRadius: 16, boxShadow: "var(--window-shadow), var(--top-light), 0 0 60px -16px var(--s3-glow)" }}>
              <div className="s3-row" style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
                <BotAvatar className="!size-8" />
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Oparax</div>
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>@oparax_ai</div>
                </div>
                <span className="s3-chip post" style={{ marginLeft: "auto" }}><XLogo className="size-3" /> DM</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ background: "var(--raised)", borderRadius: "14px 14px 14px 4px", padding: "11px 13px", fontSize: 13, lineHeight: 1.5, color: "var(--t2)" }}>
                  <div style={{ fontWeight: 600, color: "var(--t1)" }}>{parseDm(solDm).head}</div>
                  <div style={{ marginTop: 8 }}>{dm.headline}</div>
                  <div className="s3-mono s3-trunc" style={{ marginTop: 6, fontSize: 11.5, color: "var(--brand)" }}>{dm.url.replace("https://", "")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
