"use client";

// Controlled form bound to AgentConfig.
// All fields are plain controlled inputs; style uses design-system classes.

import { useState } from "react";
import { HandleInput } from "@/components/handle-input";
import type { AgentConfig } from "@/lib/chat/config";
import { MONITOR_MAX_HANDLES } from "@/lib/scan/handles";

const CADENCE_OPTIONS: {
  label: string;
  value: number;
}[] = [
  {
    label: "Every hour",
    value: 60,
  },
  {
    label: "Every 2 hours",
    value: 120,
  },
  {
    label: "Every 4 hours",
    value: 240,
  },
  {
    label: "Every 6 hours",
    value: 360,
  },
  {
    label: "Every 12 hours",
    value: 720,
  },
  {
    label: "Once a day",
    value: 1440,
  },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_PREFERRED_DOMAINS = 5;

export interface ConfigFormProps {
  value: AgentConfig;
  onChange: (next: AgentConfig) => void;
}

export function ConfigForm({ value, onChange }: ConfigFormProps) {
  function set<K extends keyof AgentConfig>(key: K, val: AgentConfig[K]) {
    onChange({
      ...value,
      [key]: val,
    });
  }

  function setSources<SK extends keyof AgentConfig["sources"]>(
    sourceKey: SK,
    patch: Partial<AgentConfig["sources"][SK]>,
  ) {
    onChange({
      ...value,
      sources: {
        ...value.sources,
        [sourceKey]: {
          ...value.sources[sourceKey],
          ...patch,
        },
      },
    });
  }

  function setSchedule<SK extends keyof AgentConfig["schedule"]>(
    key: SK,
    val: AgentConfig["schedule"][SK],
  ) {
    onChange({
      ...value,
      schedule: {
        ...value.schedule,
        [key]: val,
      },
    });
  }

  function toggleDay(day: number) {
    const days = value.schedule.daysOfWeek;
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    setSchedule("daysOfWeek", next);
  }

  function addDomain(raw: string) {
    const domain = raw
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    if (!domain) return;
    if (value.sources.web.preferredDomains.length >= MAX_PREFERRED_DOMAINS) return;
    if (value.sources.web.preferredDomains.includes(domain)) return;
    setSources("web", {
      preferredDomains: [...value.sources.web.preferredDomains, domain],
    });
  }

  function removeDomain(index: number) {
    setSources("web", {
      preferredDomains: value.sources.web.preferredDomains.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="ws-create">
      {/* Agent name */}
      <div className="ffield-wrap">
        <label className="flabel" htmlFor="cfg-name">
          Agent name
        </label>
        <input
          id="cfg-name"
          className="ws-input"
          type="text"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Transfer window tracker"
        />
      </div>

      {/* Scanning instructions */}
      <div className="ffield-wrap">
        <label className="flabel" htmlFor="cfg-scan">
          Scanning instructions
        </label>
        <textarea
          id="cfg-scan"
          className="ws-textarea"
          value={value.scanningInstructions}
          onChange={(e) => set("scanningInstructions", e.target.value)}
          placeholder="Describe what counts as a story — topics, keywords, thresholds…"
          rows={4}
        />
      </div>

      {/* Drafting instructions */}
      <div className="ffield-wrap">
        <label className="flabel" htmlFor="cfg-draft">
          Drafting instructions
        </label>
        <textarea
          id="cfg-draft"
          className="ws-textarea"
          value={value.draftingInstructions}
          onChange={(e) => set("draftingInstructions", e.target.value)}
          placeholder="Describe your voice, tone, and format for drafted posts…"
          rows={4}
        />
      </div>

      {/* X sources */}
      <div className="ffield-wrap">
        <div className="flabel-row">
          <span className="flabel">X (Twitter) sources</span>
          <input
            type="checkbox"
            id="cfg-x-enabled"
            checked={value.sources.x.enabled}
            onChange={(e) =>
              setSources("x", {
                enabled: e.target.checked,
              })
            }
            aria-label="Enable X source"
            style={{
              cursor: "pointer",
            }}
          />
          <label
            htmlFor="cfg-x-enabled"
            className="flabel"
            style={{
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Enabled
          </label>
        </div>
        {value.sources.x.enabled && (
          <HandleInput
            handles={value.sources.x.handles}
            maxHandles={MONITOR_MAX_HANDLES}
            onAdd={(h) =>
              setSources("x", {
                handles: [...value.sources.x.handles, h],
              })
            }
            onRemove={(i) =>
              setSources("x", {
                handles: value.sources.x.handles.filter((_, idx) => idx !== i),
              })
            }
          />
        )}
      </div>

      {/* Web sources */}
      <div className="ffield-wrap">
        <div className="flabel-row">
          <span className="flabel">Web sources</span>
          <input
            type="checkbox"
            id="cfg-web-enabled"
            checked={value.sources.web.enabled}
            onChange={(e) =>
              setSources("web", {
                enabled: e.target.checked,
              })
            }
            aria-label="Enable web source"
            style={{
              cursor: "pointer",
            }}
          />
          <label
            htmlFor="cfg-web-enabled"
            className="flabel"
            style={{
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Enabled
          </label>
        </div>
        {value.sources.web.enabled && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <DomainInput
              domains={value.sources.web.preferredDomains}
              maxDomains={MAX_PREFERRED_DOMAINS}
              onAdd={addDomain}
              onRemove={removeDomain}
            />
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="ffield-wrap">
        <span className="flabel">Schedule</span>

        {/* Cadence */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label
            className="flabel"
            htmlFor="cfg-cadence"
            style={{
              marginTop: 6,
            }}
          >
            Cadence
          </label>
          <select
            id="cfg-cadence"
            className="ws-input"
            value={value.schedule.cadenceMinutes ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setSchedule("cadenceMinutes", v ? Number(v) : null);
            }}
          >
            <option value="">No schedule</option>
            {CADENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Days of week */}
          <span
            className="flabel"
            style={{
              marginTop: 6,
            }}
          >
            Days of week
          </span>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {DAY_LABELS.map((label, day) => {
              const active = value.schedule.daysOfWeek.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(day)}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    borderRadius: "var(--radius)",
                    border: "1px solid",
                    borderColor: active ? "var(--accent-line)" : "var(--field-line)",
                    background: active ? "var(--accent-soft)" : "var(--field-bg)",
                    color: active ? "var(--accent)" : "var(--muted)",
                    font: "600 0.8125rem/1 var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Window start / end */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 6,
            }}
          >
            <div className="ffield-wrap">
              <label className="flabel" htmlFor="cfg-win-start">
                Window start
              </label>
              <input
                id="cfg-win-start"
                type="time"
                className="ws-input"
                value={value.schedule.windowStart ?? ""}
                onChange={(e) => setSchedule("windowStart", e.target.value || null)}
              />
            </div>
            <div className="ffield-wrap">
              <label className="flabel" htmlFor="cfg-win-end">
                Window end
              </label>
              <input
                id="cfg-win-end"
                type="time"
                className="ws-input"
                value={value.schedule.windowEnd ?? ""}
                onChange={(e) => setSchedule("windowEnd", e.target.value || null)}
              />
            </div>
          </div>

          {/* Timezone */}
          <div
            className="ffield-wrap"
            style={{
              marginTop: 6,
            }}
          >
            <label className="flabel" htmlFor="cfg-tz">
              Timezone (IANA)
            </label>
            <input
              id="cfg-tz"
              type="text"
              className="ws-input"
              value={value.schedule.timezone}
              onChange={(e) => setSchedule("timezone", e.target.value)}
              placeholder="e.g. America/New_York"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DomainInput — chip-style preferred-domain input (mirrors HandleInput style)
// ---------------------------------------------------------------------------
function DomainInput({
  domains,
  maxDomains,
  onAdd,
  onRemove,
}: {
  domains: string[];
  maxDomains: number;
  onAdd: (raw: string) => void;
  onRemove: (index: number) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  function commit(raw: string) {
    const trimmed = raw
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    if (trimmed) {
      onAdd(trimmed);
      setInputValue("");
    }
  }

  return (
    <div className="ws-handle-wrap">
      <div className="ws-handle-well">
        {domains.map((domain, i) => (
          <span key={domain} className="ws-handle-chip">
            {domain}
            <button
              type="button"
              className="ws-handle-x"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${domain}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(inputValue);
            }
            if (e.key === "Backspace" && !inputValue && domains.length > 0) {
              onRemove(domains.length - 1);
            }
          }}
          onBlur={() => {
            if (inputValue.trim()) commit(inputValue);
          }}
          placeholder={domains.length === 0 ? "e.g. reuters.com, bbc.co.uk" : ""}
          className="ws-handle-input"
          disabled={domains.length >= maxDomains}
        />
      </div>
      {domains.length > 0 && (
        <p className="ws-handle-count">
          {domains.length} of {maxDomains} added
        </p>
      )}
    </div>
  );
}
