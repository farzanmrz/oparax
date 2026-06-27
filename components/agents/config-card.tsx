"use client";

// ConfigCard — the live "here's what I'll save" view for the create chat. Read-only:
// the reporter changes it by chatting (the assistant records changes via updateConfig and
// the parent derives this config from the transcript). Replaces the old Chat/Form toggle as
// the legible config surface. The full field-editing form is deferred to the edit-by-chat slice.

import { type AgentConfig, webSourceActive, xSourceActive } from "@/lib/chat/config";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
      <span
        style={{
          flexShrink: 0,
          width: 64,
          color: "var(--faint)",
          font: "500 0.75rem/1.4 var(--font-sans)",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--muted)",
          font: "400 0.8125rem/1.45 var(--font-sans)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function ConfigCard({ config }: { config: AgentConfig }) {
  const handles = config.sources.x.handles;
  const domains = config.sources.web.preferredDomains;
  // A source counts as chosen when explicitly enabled OR when the reporter named handles/
  // domains for it (shared with configToColumns so the card and Save never diverge) — so listed
  // handles always show even if the enabled flag lags, and an unchosen source (the seed default)
  // stays out of the card entirely.
  const xActive = xSourceActive(config);
  const webActive = webSourceActive(config);
  const xSummary = xActive
    ? handles.length > 0
      ? handles.map((h) => `@${h}`).join(" ")
      : "X — broad search"
    : null;
  const webSummary = webActive
    ? domains.length > 0
      ? domains.join(" ")
      : "web — broad search"
    : null;
  const sources = [xSummary, webSummary].filter(Boolean).join("  ·  ");

  const hasContent =
    Boolean(config.name) ||
    Boolean(config.scanningInstructions) ||
    Boolean(sources) ||
    Boolean(config.draftingInstructions) ||
    config.exampleTweets.length > 0;
  if (!hasContent) return null;

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        background: "var(--inset)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      <div
        style={{
          color: "var(--faint)",
          font: "600 0.6875rem/1 var(--font-sans)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 2,
        }}
      >
        What I'll save
      </div>
      <Row label="Name" value={config.name || "—"} />
      <Row label="Watching" value={config.scanningInstructions || "—"} />
      <Row label="Sources" value={sources || "—"} />
      <Row label="Voice" value={config.draftingInstructions || "—"} />
      {config.exampleTweets.length > 0 && (
        <Row
          label="Examples"
          value={`${config.exampleTweets.length} pasted post${config.exampleTweets.length === 1 ? "" : "s"}`}
        />
      )}
    </div>
  );
}
