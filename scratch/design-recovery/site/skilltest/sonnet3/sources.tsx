import { Quote as QuoteIcon } from "lucide-react";
import { Dot, GitHubMark, KindChip, ReportMark, SiteIcon, XAvatar } from "@/next/council/marks";
import { Checking, Img, Nav, SourceChip, type SourceKind } from "./parts";
import { beat, brief, chosenAccounts, chosenSites, digests, hostOf, items, recentItems as r, when } from "./data";
import type { ItemView } from "@/next/data/feed";

type Row = { key: string; kind: SourceKind; name: string; sub: string; mark: React.ReactNode; report?: ItemView };

const newest: Record<string, ItemView> = {
  "vercel-product-and-platform-news": r.vercelMai,
  "hugging-face-community-ml-research-blog": r.olmoCore,
  "simon-willison-personal-tech-blog": r.simonSol,
  "latent-space-ai-engineering-newsletter-and-podcast": r.latentSol,
  "mistral-ai-company-news": r.mistralMunich,
};

const rows: Row[] = [
  ...chosenSites.map((s) => ({
    key: s.id,
    kind: (s.kind === "rss" ? "rss" : "site") as SourceKind,
    name: s.name,
    sub: s.focus,
    mark: <SiteIcon host={hostOf(s.target)} size={18} />,
    report: newest[s.id],
  })),
  ...chosenAccounts.map((a) => ({
    key: a.id,
    kind: "x" as SourceKind,
    name: a.name,
    sub: a.handle,
    mark: <XAvatar handle={a.handle} size={18} />,
    report: a.id === "q-nextjs" ? items.nextPost : undefined,
  })),
  {
    key: "gh",
    kind: "github" as SourceKind,
    name: "vercel/next.js",
    sub: "Releases",
    mark: <GitHubMark className="size-[18px] text-t1" />,
  },
];

export function Sources() {
  return (
    <section className="s3-screen" id="sources">
      <div className="s3-light" style={{ background: "radial-gradient(55% 50% at 30% 20%, var(--s3-glow), transparent 70%), radial-gradient(35% 40% at 95% 85%, var(--s3-glow-2), transparent 70%)" }} />
      <div className="s3-wrap">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 48 }}>
          <div>
            <div className="s3-label" style={{ color: "var(--brand)" }}>Sources</div>
            <h2 className="s3-h2" style={{ marginTop: 10 }}>Every source, weighed the same</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 640 }}>
            <SourceChip kind="x" count={chosenAccounts.length} large />
            <SourceChip kind="rss" count={chosenSites.filter((s) => s.kind === "rss").length} large />
            <SourceChip kind="site" count={chosenSites.filter((s) => s.kind !== "rss").length} word="Website" large />
            <SourceChip kind="github" count={digests.length} large />
            <SourceChip kind="ph" large />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "864px minmax(0, 1fr)", gap: 24, marginTop: 28 }}>
          <div className="s3-window" style={{ borderRadius: 16 }}>
            <div className="s3-bar" style={{ height: 46 }}>
              <span style={{ fontWeight: 600 }}>Sources for @farzanmrz</span>
              <span className="s3-count">{rows.length}</span>
              <span className="s3-label" style={{ marginLeft: "auto" }}>newest report</span>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "232px 118px 1fr",
                  alignItems: "center",
                  gap: 12,
                  height: 37,
                  padding: "0 16px",
                  borderBottom: i === rows.length - 1 ? 0 : "1px solid var(--line-soft)",
                  boxShadow: `inset 2px 0 0 var(--${row.kind === "x" ? "kind-post" : row.kind === "rss" ? "kind-rss" : row.kind === "site" ? "kind-site" : "kind-github"})`,
                }}
              >
                <div className="s3-row" style={{ gap: 9 }}>
                  {row.mark}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }} className="s3-trunc">{row.name}</span>
                  <span style={{ fontSize: 12, color: "var(--t4)" }} className="s3-trunc">{row.kind === "x" ? row.sub : ""}</span>
                </div>
                <div>
                  <SourceChip kind={row.kind} word={row.kind === "x" ? "X account" : row.kind === "rss" ? "RSS feed" : row.kind === "site" ? "Website" : "GitHub"} />
                </div>
                {row.report ? (
                  <div className="s3-row" style={{ gap: 8 }}>
                    {row.report.image ? <Img src={row.report.image} className="s3-thumb" style={{ width: 52, height: 29 }} /> : null}
                    <span className="s3-trunc" style={{ fontSize: 12.5, color: "var(--t2)" }}>{row.report.title}</span>
                    <span className="s3-mono s3-num" style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--t4)", whiteSpace: "nowrap" }}>{when(row.report.published_at)}</span>
                  </div>
                ) : (
                  <span className="s3-trunc" style={{ fontSize: 12.5, color: "var(--t4)" }}>{row.kind === "x" ? "" : row.sub}</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="s3-card" style={{ padding: 16, borderRadius: 14 }}>
              <div className="s3-row">
                <span style={{ fontSize: 13, fontWeight: 600 }}>Your sentence</span>
                <span className="s3-chip post" style={{ marginLeft: "auto" }}>Read from X once</span>
              </div>
              <div style={{ marginTop: 12, border: "1px solid var(--brand-line)", background: "var(--brand-soft)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, fontSize: 15, lineHeight: 1.45, color: "var(--t1)" }}>
                <QuoteIcon className="size-4 shrink-0 text-[var(--brand)]" style={{ marginTop: 3 }} />
                {beat}
              </div>
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {brief.interests.map((t) => (
                  <span key={t} className="s3-chip">{t}</span>
                ))}
              </div>
            </div>

            <div className="s3-window" style={{ borderRadius: 14 }}>
              <div className="s3-bar">
                <span style={{ fontWeight: 600 }}>New reports, judged</span>
              </div>
              <Checking>Checking 1 item against your sentence</Checking>
              {[r.olmoCore, r.vercelMai, r.vercelAgent, r.simonSol].map((it) => (
                <div key={it.id} className="s3-row" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line-soft)", gap: 10 }}>
                  <Img src={it.image!} className="s3-thumb" style={{ width: 56, height: 32 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="s3-row s3-trunc" style={{ fontSize: 12.5, color: "var(--t1)", fontWeight: 500, gap: 6 }}><ReportMark item={it} size={13} className="rounded-[3px]" />{it.publisher}</div>
                    <div className="s3-trunc" style={{ fontSize: 12, color: "var(--t3)" }}>{it.title}</div>
                  </div>
                  <span className="s3-chip ok">Fits</span>
                </div>
              ))}
              <div className="s3-row" style={{ padding: "10px 14px", background: "var(--error-soft)", fontSize: 13, gap: 10 }}>
                <Dot tone="error" />
                Could not process 1 item
              </div>
            </div>

            <div className="s3-card" style={{ padding: 14, borderRadius: 14 }}>
              <div className="s3-row">
                <GitHubMark className="size-4 text-t1" />
                <span className="s3-label">GitHub digest</span>
                <span className="s3-chip github" style={{ marginLeft: "auto" }}>Release</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>{digests[0].name}</div>
              <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 2 }}>{digests[0].description}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
