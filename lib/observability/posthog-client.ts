// PostHog initializes and records on every page from the first load. Auth pages record too, but
// every auth URL is reduced to its origin and path, and hidden inputs never enter the replay.
//
// Product text and ordinary inputs stay visible by owner decision. Passwords are masked, while
// network bodies and headers are never captured.
//
// Identity persists in localStorage so an anonymous visit can join the reporter after sign-in.

import posthog from "posthog-js";

// These paths may carry a one-time token. PostHog records them like every other page, but every
// matching URL is reduced to origin and pathname before it leaves the browser.
const AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/reset-password",
  "/auth/confirm",
];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const TOKEN_URL_PATTERN = new RegExp(
  `((?:https?:\\/\\/[^\\s"'<>/)]+)?((?:${AUTH_PATHS.map((path) =>
    path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})(?:\\/[^\\s"'<>?#)]*)?))[?#][^\\s"'<>)]*`,
  "g",
);

function scrubTokenUrl(value: string): string {
  TOKEN_URL_PATTERN.lastIndex = 0;
  if (!TOKEN_URL_PATTERN.test(value)) {
    TOKEN_URL_PATTERN.lastIndex = 0;
    return value;
  }

  TOKEN_URL_PATTERN.lastIndex = 0;
  return value.replace(TOKEN_URL_PATTERN, (match, safeValue: string, pathname: string) =>
    isAuthPath(pathname) ? safeValue : match,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

const SCRUB_IN_PROGRESS = Symbol("scrub-in-progress");

function scrubProperties(value: unknown, memo = new WeakMap<object, unknown>()): unknown {
  if (typeof value === "string") return scrubTokenUrl(value);
  if (value === null || typeof value !== "object") return value;
  if (memo.has(value)) {
    const scrubbed = memo.get(value);
    return scrubbed === SCRUB_IN_PROGRESS ? null : scrubbed;
  }
  memo.set(value, SCRUB_IN_PROGRESS);

  if (Array.isArray(value)) {
    const scrubbed = value.map((item) => scrubProperties(item, memo));
    memo.set(value, scrubbed);
    return scrubbed;
  }
  if (!isPlainObject(value)) {
    memo.set(value, value);
    return value;
  }

  // This generic pass covers $current_url, $referrer, $initial_referrer,
  // $initial_current_url, $session_entry_url, $session_entry_referrer, $pageleave URLs,
  // exception frames, autocapture hrefs, and future URL-shaped properties without a key list.
  const scrubbed = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "$snapshot_data" ? item : scrubProperties(item, memo),
    ]),
  );
  memo.set(value, scrubbed);
  return scrubbed;
}

export function initPostHog(): void {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.info("PostHog is disabled because NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is missing");
    }
    return;
  }
  if (posthog.__loaded) return;

  posthog.init(token, {
    // Set NEXT_PUBLIC_POSTHOG_HOST to https://oparax.ai/ingest in production so events ride
    // the first-party proxy (next.config.ts rewrites); ui_host keeps toolbar/app links
    // pointing at PostHog itself rather than the proxy.
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com",
    // Pin the SDK's dated default preset (reference init parity); every explicit option below
    // still wins over the preset.
    defaults: "2026-01-30",
    debug: process.env.NODE_ENV === "development",
    capture_exceptions: true,
    capture_pageview: "history_change",
    // The recorder loads separately, so place it in the head where React hydration keeps it.
    external_scripts_inject_target: "head",
    // Mask token_hash in every SDK-built URL, including payloads that bypass before_send.
    // The scrubber below still removes the entire query from auth-page URLs.
    custom_personal_data_properties: ["token_hash"],
    mask_all_text: false,
    mask_personal_data_properties: true,
    before_send: (event) => {
      if (event === null) return null;

      try {
        event.properties = scrubProperties(event.properties) as typeof event.properties;
        if (event.$set !== undefined) {
          event.$set = scrubProperties(event.$set) as typeof event.$set;
        }
        if (event.$set_once !== undefined) {
          event.$set_once = scrubProperties(event.$set_once) as typeof event.$set_once;
        }

        const snapshotData = event.properties.$snapshot_data;
        if (event.event === "$snapshot" && Array.isArray(snapshotData)) {
          for (const entry of snapshotData) {
            if (!isPlainObject(entry) || !isPlainObject(entry.data)) continue;
            // rrweb type 4 = Meta href, type 5 = custom event payload,
            // and type 6 = console/plugin payload.
            if (typeof entry.data.href === "string") {
              entry.data.href = scrubTokenUrl(entry.data.href);
            }
            if (entry.type === 5) {
              entry.data.payload = scrubProperties(entry.data.payload);
            }
            if (entry.type === 6) {
              entry.data.payload = scrubProperties(entry.data.payload);
            }
          }
        }

        return event;
      } catch {
        return null;
      }
    },
    persistence: "localStorage",
    session_recording: {
      blockSelector: 'input[type="hidden"]',
      // Keep rrweb events as plain arrays so before_send can defensively scrub replay URLs.
      compress_events: false,
      maskAllInputs: false,
      maskInputOptions: { password: true },
      maskCapturedNetworkRequestFn: (data) => {
        if (typeof data.name === "string") data.name = scrubTokenUrl(data.name);
        return data;
      },
      recordBody: false,
      recordHeaders: false,
      slimDOMOptions: { script: true },
    },
  });
}
