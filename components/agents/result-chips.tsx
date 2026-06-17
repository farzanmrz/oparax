"use client";

// Result chips rendered from verifyHandles / validateSites server-tool outputs.
// Shapes are matched exactly from lib/x/verify.ts and lib/sites/validate.ts.

import type { VerifyHandlesResult } from "@/lib/x/verify";
import type { SiteValidationResult } from "@/lib/sites/validate";

// ---------------------------------------------------------------------------
// VerifyChips — renders verified/invalid X handles from verifyHandles output
// ---------------------------------------------------------------------------

interface VerifyChipsProps {
  output: VerifyHandlesResult;
}

/**
 * Renders confirmed (green) and not-found (red) handle chips from the
 * `verifyHandles` tool output. Also shows a soft-unverified note when the
 * X API was unavailable and handles were accepted without confirmation.
 */
export function VerifyChips({ output }: VerifyChipsProps) {
  const { valid, invalid, softUnverified } = output;

  if (valid.length === 0 && invalid.length === 0) {
    return null;
  }

  return (
    <div className="result-chips">
      {valid.map((h) => (
        <span key={h.username} className="rchip rchip-ok">
          <span className="rchip-icon" aria-hidden="true">
            ✓
          </span>
          @{h.username}
          {h.name ? <span className="rchip-sub">{h.name}</span> : null}
          {h.protected ? <span className="rchip-sub">protected · monitoring soon</span> : null}
        </span>
      ))}
      {invalid.map((h) => (
        <span key={h} className="rchip rchip-err">
          <span className="rchip-icon" aria-hidden="true">
            ✗
          </span>
          @{h}
        </span>
      ))}
      {softUnverified && <span className="rchip-note">Accepted without X API confirmation</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SiteChips — renders site validation results from validateSites output
// ---------------------------------------------------------------------------

interface SiteChipsProps {
  output: SiteValidationResult[];
}

function siteStatus(site: SiteValidationResult): "ok" | "warn" | "err" {
  if (!site.reachable) return "err";
  if (!site.readable) return "warn";
  return "ok";
}

const STATUS_ICON: Record<"ok" | "warn" | "err", string> = {
  ok: "✓",
  warn: "⚠",
  err: "✗",
};

/**
 * Renders site validation chips: reachable (green), paywalled/warn (accent),
 * unreachable (red). Shows the `note` from validateSites when non-empty.
 */
export function SiteChips({ output }: SiteChipsProps) {
  if (output.length === 0) return null;

  return (
    <div className="result-chips">
      {output.map((site) => {
        const status = siteStatus(site);
        return (
          <span key={site.domain} className={`rchip rchip-${status}`}>
            <span className="rchip-icon" aria-hidden="true">
              {STATUS_ICON[status]}
            </span>
            {site.domain}
            {site.note ? <span className="rchip-sub">{site.note}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
