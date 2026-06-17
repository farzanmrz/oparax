// Known paywalled sites — keep this list short and well-known.
// Readable heuristic: if the domain (or any suffix) matches, mark as unreadable.
const KNOWN_PAYWALL = new Set([
  "nytimes.com",
  "wsj.com",
  "ft.com",
  "bloomberg.com",
  "economist.com",
  "theathletic.com",
]);

function isPaywalled(hostname: string): boolean {
  // Strip www. prefix then match exact domain or any suffix.
  const host = hostname.replace(/^www\./, "");
  if (KNOWN_PAYWALL.has(host)) return true;
  // Also match subdomains like "www.nytimes.com" -> "nytimes.com".
  for (const pw of KNOWN_PAYWALL) {
    if (host === pw || host.endsWith(`.${pw}`)) return true;
  }
  return false;
}

function normalizeToOrigin(domain: string): string | null {
  // Accept bare domains, http/https URLs. Strip any path.
  try {
    const raw = domain.trim();
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withScheme);
    return url.origin; // e.g. "https://example.com"
  } catch {
    return null;
  }
}

export interface SiteValidationResult {
  domain: string;
  reachable: boolean;
  readable: boolean;
  note: string;
}

/**
 * Check a list of domains for reachability and best-effort readability.
 * Reachable: a HEAD request returns 2xx or 3xx.
 * Readable: reachable + status not 401/403 + not in the known-paywall list.
 * Never throws — any network error collapses to { reachable:false, readable:false }.
 *
 * @param domains - raw domain strings or URLs
 * @returns one result object per input domain
 */
export async function validateSites(domains: string[]): Promise<SiteValidationResult[]> {
  return Promise.all(
    domains.map(async (domain): Promise<SiteValidationResult> => {
      const origin = normalizeToOrigin(domain);

      if (!origin) {
        return {
          domain,
          reachable: false,
          readable: false,
          note: "invalid domain",
        };
      }

      let status: number;
      let hostname: string;

      try {
        const url = new URL(origin);
        hostname = url.hostname;

        const response = await fetch(origin, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(5000),
        });

        status = response.status;
      } catch {
        return {
          domain,
          reachable: false,
          readable: false,
          note: "unreachable",
        };
      }

      const reachable = status >= 200 && status < 400;

      if (!reachable) {
        return {
          domain,
          reachable: false,
          readable: false,
          note: `HTTP ${status}`,
        };
      }

      if (status === 401 || status === 403) {
        return {
          domain,
          reachable: true,
          readable: false,
          note: `access denied (HTTP ${status})`,
        };
      }

      if (isPaywalled(hostname)) {
        return {
          domain,
          reachable: true,
          readable: false,
          note: "known paywall — content may not be accessible",
        };
      }

      return {
        domain,
        reachable: true,
        readable: true,
        note: "",
      };
    }),
  );
}
