import { Layers } from "lucide-react";
import { KindChip, MarkStack, ReportMark } from "@/next/council/marks";
import { Img } from "./parts";
import { Facts } from "./facts";
import { agent, mai, mistral, olmo, sol, when } from "./data";
import type { FeedStory } from "@/next/data/feed";

function spansFor(story: FeedStory, itemId: string) {
  const out: { n: number; span: string }[] = [];
  story.card.facts.forEach((f, i) => f.evidence.filter((e) => e.item === itemId).forEach((e) => out.push({ n: i + 1, span: e.span.replace(/^["“]|["”]$/g, "") })));
  return out;
}

function Mini({ story }: { story: FeedStory }) {
  const it = story.items[0];
  return (
    <article className="s3-window" style={{ borderRadius: 14, display: "grid", gridTemplateColumns: "190px 1fr", height: 150 }}>
      <Img src={story.card.image!} style={{ width: 190, height: "100%", objectFit: "cover" }} />
      <div style={{ padding: "14px 16px", minWidth: 0 }}>
        <div className="s3-row" style={{ gap: 8 }}>
          <KindChip kind={it.kind} count={1} />
          <span className="s3-mono s3-num" style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--t4)" }}>{when(it.published_at)}</span>
        </div>
        <h4 className="s3-clamp2" style={{ margin: "10px 0 8px", fontSize: 16, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.01em" }}>{story.card.headline}</h4>
        <div className="s3-row" style={{ gap: 8, fontSize: 12.5, color: "var(--t3)" }}>
          <ReportMark item={it} size={16} className="rounded-[4px]" />
          {it.publisher}
        </div>
      </div>
    </article>
  );
}

export function Stories() {
  const [latent, simon] = sol.items;
  return (
    <section className="s3-screen" id="stories">
      <div className="s3-light" style={{ background: "radial-gradient(50% 55% at 38% 40%, var(--s3-glow), transparent 70%), radial-gradient(35% 35% at 100% 10%, var(--s3-glow-2), transparent 70%)" }} />
      <div className="s3-wrap">
        <div style={{ paddingTop: 48 }}>
          <div className="s3-label" style={{ color: "var(--kind-article)" }}>Stories</div>
          <h2 className="s3-h2" style={{ marginTop: 10 }}>Many reports, one story, every line cited</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "820px minmax(0, 1fr)", gap: 28, marginTop: 28 }}>
          <div style={{ position: "relative" }}>
            <div className="s3-card" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 520, transform: "translate(18px, 18px) scale(0.985)", transformOrigin: "top left", opacity: 0.7, borderRadius: 18 }} />
            <div className="s3-card" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 520, transform: "translate(36px, 36px) scale(0.97)", transformOrigin: "top left", opacity: 0.45, borderRadius: 18 }} />
            <article className="s3-window" style={{ borderRadius: 18, boxShadow: "var(--window-shadow), var(--top-light), 0 0 90px -24px var(--s3-glow)" }}>
              <div style={{ position: "relative", height: 232 }}>
                <Img src={sol.card.image!} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 38%" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgb(0 0 0 / 0.4))" }} />
                <span className="s3-chip" style={{ position: "absolute", left: 18, top: 16, background: "rgb(10 12 16 / 0.72)", color: "#fff" }}>
                  <Layers className="size-3" /> 2 reports, one story
                </span>
              </div>
              <div style={{ padding: "18px 26px 22px" }}>
                <div className="s3-row" style={{ gap: 8 }}>
                  <span className="s3-chip article">2 Articles</span>
                  <span className="s3-chip">5 facts</span>
                  <span className="s3-mono s3-num" style={{ marginLeft: "auto", fontSize: 11, color: "var(--t4)" }}>Sep 30, 05:53 UTC</span>
                </div>
                <h3 style={{ margin: "12px 0 14px", fontSize: 30, lineHeight: 1.12, letterSpacing: "-0.028em", fontWeight: 600 }}>{sol.card.headline}</h3>
                <Facts story={sol} max={4} />
                <div className="s3-row" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--t3)" }}>
                  <MarkStack items={sol.items} size={22} />
                  Latent Space, Simon Willison
                </div>
              </div>
            </article>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="s3-label">Evidence, in their own words</div>
            {[simon, latent].map((it) => (
              <div key={it.id} className="s3-card" style={{ padding: 14, borderRadius: 14 }}>
                <div className="s3-row" style={{ gap: 9 }}>
                  <ReportMark item={it} size={20} className="rounded-[5px]" />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{it.publisher}</span>
                  <KindChip kind="article" />
                  <span className="s3-mono s3-num" style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--t4)" }}>{when(it.published_at)}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 11 }}>
                  {spansFor(sol, it.id).slice(0, 3).map((s) => (
                    <div key={s.n + s.span} className="s3-quote" style={{ display: "flex", gap: 10 }}>
                      <span className="s3-mono" style={{ color: "var(--kind-article)", fontSize: 11, marginTop: 2 }}>{s.n}</span>
                      <span><mark>“{s.span.length > 92 ? s.span.slice(0, 90) + "…" : s.span}”</mark></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, position: "absolute", left: 0, right: 0, bottom: 40 }}>
          <Mini story={olmo} />
          <Mini story={mai} />
          <Mini story={mistral} />
        </div>
      </div>
    </section>
  );
}
