// Usage kind/provider unions. Defined locally (not from the DB enums) because the
// persistent usage subsystem was removed — these label the trace lines emitted by
// logUsage and will be the seed when usage is rebuilt from scratch.
export type UsageKind = "chat" | "scan" | "draft" | "redraft" | "x_verify" | "web_validate";
export type UsageProvider = "xai" | "gateway" | "x_api" | "internal" | "deepinfra" | "deepseek";
