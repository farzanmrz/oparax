import { Check } from "lucide-react";
import { OparaxMark, XLogo } from "@/pro/shared/brand";
import { Segments } from "@/next/council/marks";
import { Img, SignUpButton, SourceChip } from "./parts";
import { agent, mai, mistral, olmo, sol } from "./data";

const tiers = [
  { name: "Free week", price: "$0", per: "for 7 days", pool: 300, cadence: "day", note: "No card. It starts when your agent is ready.", hue: "ok" },
  { name: "Hobby", price: "$5", per: "a month", pool: 100, cadence: "day", note: "One DM a day", hue: "brand" },
  { name: "Creator", price: "$30", per: "a month", pool: 3000, cadence: "day", note: "One DM a day", hue: "brand" },
  { name: "Wire", price: "$99", per: "a month", pool: 4000, cadence: "wire", note: "Every 15 minutes when there is news", hue: "brand" },
] as const;

function Cadence({ wire }: { wire: boolean }) {
  const n = wire ? 48 : 7;
  return (
    <div style={{ display: "flex", gap: wire ? 2 : 6, alignItems: "flex-end", height: 28 }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ flex: 1, height: wire ? 8 + ((i * 7) % 5) * 4 : 22, borderRadius: 2, background: wire ? "var(--kind-article)" : "var(--brand)", opacity: wire ? 0.55 + ((i * 3) % 4) * 0.15 : 0.9 }} />
      ))}
    </div>
  );
}

export function Plans() {
  const imgs = [sol, olmo, mistral, mai].map((s) => s.card.image!);
  return (
    <section className="s3-screen" id="plans">
      <div className="s3-light" style={{ background: "radial-gradient(55% 45% at 50% 22%, var(--s3-glow), transparent 70%), radial-gradient(40% 30% at 85% 100%, var(--s3-glow-2), transparent 70%)" }} />
      <div className="s3-wrap">
        <div style={{ paddingTop: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div className="s3-label" style={{ color: "var(--ok)" }}>Plans</div>
            <h2 className="s3-h2" style={{ marginTop: 10 }}>A free week, then a plan</h2>
          </div>
          <div className="s3-row" style={{ gap: 10, fontSize: 14, color: "var(--t3)" }}>
            Websites and RSS feeds are unlimited on every plan
            <SourceChip kind="rss" large />
            <SourceChip kind="site" large />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 28 }}>
          {tiers.map((t) => {
            const wire = t.name === "Wire";
            return (
              <div
                key={t.name}
                className={wire ? "s3-window" : "s3-card"}
                style={{ padding: 20, borderRadius: 16, height: 304, display: "flex", flexDirection: "column", ...(wire ? { boxShadow: "var(--window-shadow), var(--top-light), 0 0 70px -18px var(--s3-glow)", borderColor: "var(--brand-line)" } : {}) }}
              >
                <div className="s3-row" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</span>
                  {t.name === "Free week" ? <span className="s3-chip ok">No card</span> : null}
                  {wire ? <span className="s3-chip article">Mini digest</span> : null}
                </div>
                <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}>{t.price}</span>
                  <span style={{ fontSize: 13, color: "var(--t3)" }}>{t.per}</span>
                </div>
                <hr className="s3-sep" style={{ margin: "18px 0 14px" }} />
                <div className="s3-row" style={{ justifyContent: "space-between" }}>
                  <span className="s3-label">Watched X posts</span>
                  <span className="s3-row" style={{ gap: 6, fontSize: 13.5, fontWeight: 600 }}><XLogo className="size-3 text-[var(--brand)]" /> {t.pool.toLocaleString("en-US")}</span>
                </div>
                <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "var(--line-strong)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(3, (t.pool / 4000) * 100)}%`, height: "100%", background: "var(--brand)", borderRadius: 999 }} />
                </div>
                <div className="s3-label" style={{ marginTop: 18 }}>Alerts in your X DMs</div>
                <div style={{ marginTop: 8, fontSize: 13.5, color: "var(--t2)" }}>{t.name === "Free week" ? "Daily alerts in your free week" : t.note}</div>
                <div style={{ marginTop: "auto" }}>
                  {t.name === "Free week" ? <Segments total={7} filled={7} /> : <Cadence wire={wire} />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="s3-stage" style={{ marginTop: 24, height: 346, borderRadius: 22 }}>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "560px 1fr", height: "100%", alignItems: "center", padding: "0 44px" }}>
            <div>
              <div className="s3-row" style={{ gap: 10 }}>
                <OparaxMark className="size-6" />
                <span className="s3-label">Free for 7 days</span>
              </div>
              <h3 style={{ margin: "12px 0 8px", fontSize: 36, lineHeight: 1.08, letterSpacing: "-0.032em", fontWeight: 600 }}>Bring the wide internet to your X.</h3>
              <p className="s3-lede" style={{ fontSize: 14.5 }}>Sign up first. Then give your X handle and one sentence about what you cover.</p>
              <div className="s3-row" style={{ marginTop: 18, gap: 12 }}>
                <SignUpButton label="Start your free week" />
                <a href="#" className="s3-btn ghost">Log in</a>
              </div>
            </div>
            <div style={{ position: "relative", height: "100%" }}>
              {imgs.map((src, i) => (
                <Img
                  key={src}
                  src={src}
                  style={{
                    position: "absolute",
                    width: 206,
                    height: 136,
                    objectFit: "cover",
                    borderRadius: 12,
                    left: i * 166,
                    top: 92 + (i % 2 === 0 ? 30 : -18),
                    zIndex: i,
                    transform: `rotate(${(i - 1.5) * 3}deg)`,
                    boxShadow: "0 0 0 1px var(--line-strong), 0 18px 40px -12px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <footer className="s3-row" style={{ position: "absolute", left: 0, right: 0, bottom: 22, justifyContent: "space-between", fontSize: 12.5, color: "var(--t4)" }}>
          <span className="s3-row" style={{ gap: 8 }}><OparaxMark className="size-4" /> Oparax</span>
          <span className="s3-row" style={{ gap: 20 }}><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></span>
        </footer>
      </div>
    </section>
  );
}
