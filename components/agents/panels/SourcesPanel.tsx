"use client";

import type { AgentConfig } from "@/lib/chat/config";
import { ConfigForm } from "../config-form";

export function SourcesPanel({
  config,
  onChange,
  onSave,
  saving,
}: {
  config: AgentConfig;
  onChange: (next: AgentConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <ConfigForm value={config} onChange={onChange} />
      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          className={`btn btn-primary${saving ? " loading" : ""}`}
          onClick={onSave}
          disabled={saving}
        >
          <span className="ld" aria-hidden="true" />
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
