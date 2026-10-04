import { Check, Layers } from "lucide-react";
import { BotAvatar, XLogo } from "@/pro/shared/brand";
import { Dot, KindChip, Segments, StepArea, WeekBars } from "@/next/council/marks";
import { Img } from "./parts";
import { parseDm, olmo, olmoDm, sol, solDm, week, weekTotal } from "./data";

function Dm({ text, image, story }: { text: string; image: string | null; story: typeof sol }) {
  const dm = parseDm(text);
  const e = dm.entries[0];
  return (
    <div style={{ maxWidth: 470 }}>
      <div style={{ background: "var(--raised)", borderRadius: "18px 18px 18px 5px", overflow: "hidden", boxShadow: "inset 0 0 0 1px var(--line)" }}>
        <div style={{ padding: "13px 16px 12px", fontSize: 14, lineHeight: 1.5, color: "var(--t2)" }}>
          <div style={{ fontWeight: 600, color: "var(--t1)" }}>{dm.head}</div>
          <div style={{ marginTop: 8, color: "var(--t1)" }}>{e.headline}</div>
          <div style={{ marginTop: 4 }}>{e.fact}</div>
        </div>
        <div style={{ margin: "0 8px 8px", borderRadius: 12, overflow: "hidden", background: "var(--card)", boxShadow: "0 0 0 1px var(--line)" }}>
          {image ? <Img src={image} style={{ width: "100%", height: 112, objectFit: "cover" }} /> : null}
          <div style={{ padding: "9px 12px" }}>
            <div className="s3-mono s3-trunc" style={{ fontSize: 11, color: "var(--t4)" }}>oparax.ai</div>
            <div className="s3-trunc" style={{ fontSize: 13, fontWeight: 600 }}>{story.card.headline}</div>
          </div>
        </div>
      </div>
      <div className="s3-mono s3-trunc" style={{ marginTop: 6, fontSize: 11.5, color: "var(--brand)", paddingLeft: 6 }}>{e.url.replace("https://", "")}</div>
    </div>
  );
}

export function Alerts() {
  return (
    <section className="s3-screen" id="alerts">
      <div className="s3-light" style={{ background: "radial-gradient(55% 55% at 22% 55%, var(--s3-glow), transparent 70%), radial-gradient(35% 40% at 92% 10%, var(--s3-glow-2), transparent 70%)" }} />
      <div className="s3-wrap">
        <div style={{ paddingTop: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div className="s3-label" style={{ color: "var(--brand)" }}>Alerts</div>
            <h2 className="s3-h2" style={{ marginTop: 10 }}>One DM per story, on X</h2>
          </div>
          <p className="s3-lede" style={{ maxWidth: 460, textAlign: "right", fontSize: 14.5 }}>
            Later reports improve the story on your page. They never DM you again.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "700px minmax(0, 1fr)", gap: 28, marginTop: 28 }}>
          <div className="s3-window" style={{ borderRadius: 18, height: 740, boxShadow: "var(--window-shadow), var(--top-light), 0 0 90px -24px var(--s3-glow)" }}>
            <div className="s3-row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
              <BotAvatar className="!size-10" />
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Oparax</div>
                <div style={{ fontSize: 12.5, color: "var(--t3)" }}>@oparax_ai</div>
              </div>
              <span className="s3-chip post lg" style={{ marginLeft: "auto" }}><XLogo className="size-3" /> Direct message</span>
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="s3-mono" style={{ textAlign: "center", fontSize: 11, color: "var(--t4)" }}>Sep 30, 05:53 UTC</div>
              <div style={{ alignSelf: "flex-end", maxWidth: 300 }}>
                <div style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "10px 16px", borderRadius: "18px 18px 5px 18px", fontSize: 14 }}>Start alerts</div>
              </div>
              <Dm text={solDm} image={sol.card.image} story={sol} />
              <div className="s3-mono" style={{ textAlign: "center", fontSize: 11, color: "var(--t4)" }}>Oct 1, 15:01 UTC</div>
              <Dm text={olmoDm} image={olmo.card.image} story={olmo} />
            </div>
            <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90, background: "linear-gradient(180deg, transparent, var(--window))", pointerEvents: "none" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18, height: 740 }}>
            <div className="s3-card" style={{ padding: 20, borderRadius: 14 }}>
              <div className="s3-row">
                <XLogo className="size-4" />
                <span className="s3-label">Alerts on X</span>
                <span className="s3-row" style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--t3)", gap: 7 }}><Dot tone="idle" /> Not connected</span>
              </div>
              <div style={{ marginTop: 12, fontSize: 14.5, color: "var(--t2)", lineHeight: 1.5 }}>
                Send “Start alerts” to @oparax_ai from your own X account. That message is how Oparax confirms the account is yours.
              </div>
              <a href="#" className="s3-btn primary" style={{ marginTop: 14, width: "100%" }}><XLogo className="size-3.5" /> Get alerts on X</a>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="s3-tile">
                <span className="s3-label">Agent</span>
                <div className="s3-row" style={{ marginTop: 6, fontSize: 18, fontWeight: 600, color: "var(--ok)", gap: 8 }}><Dot tone="ok" pulse /> Live</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>Watching 10 sites and feeds, 7 X accounts</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="s3-tile">
                  <span className="s3-label">Checking</span>
                  <div className="s3-row" style={{ marginTop: 6, fontSize: 22, fontWeight: 600 }}><span className="s3-spin" /> 1</div>
                </div>
                <div className="s3-tile">
                  <span className="s3-label">Failed</span>
                  <div className="s3-row" style={{ marginTop: 6, fontSize: 22, fontWeight: 600, color: "var(--error)" }}><Dot tone="error" /> 1</div>
                </div>
              </div>
            </div>

            <div className="s3-card" style={{ padding: 18, borderRadius: 14, flex: 1 }}>
              <div className="s3-row" style={{ justifyContent: "space-between" }}>
                <span className="s3-label">Reports published</span>
                <span className="s3-label">by publication date</span>
              </div>
              <div className="s3-row" style={{ marginTop: 6, fontSize: 28, fontWeight: 600, alignItems: "baseline" }}>
                {weekTotal} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--t3)" }}>in the last 7 days</span>
              </div>
              <StepArea values={week.map((d) => d.count)} height={170} className="mt-3" />
              <div className="s3-row" style={{ justifyContent: "space-between", marginTop: 4 }}>
                <span className="s3-mono" style={{ fontSize: 10.5, color: "var(--t4)" }}>{week[0].label.toUpperCase()}</span>
                <span className="s3-mono" style={{ fontSize: 10.5, color: "var(--t4)" }}>{week[6].label.toUpperCase()}</span>
              </div>
            </div>

            <div className="s3-card" style={{ padding: 16, borderRadius: 14 }}>
              <div className="s3-row" style={{ justifyContent: "space-between" }}>
                <span className="s3-label">Free week</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>7 days left</span>
              </div>
              <div style={{ marginTop: 10 }}><Segments total={7} filled={7} /></div>
              <div className="s3-row" style={{ justifyContent: "space-between", marginTop: 14 }}>
                <span className="s3-label">Watched X posts</span>
                <span style={{ fontSize: 13 }}>0 of 300</span>
              </div>
              <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: "var(--line-strong)" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
