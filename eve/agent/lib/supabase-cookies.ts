// agent/lib/supabase-cookies.ts
//
// Pure read-path reimplementation of @supabase/ssr's cookie contract. NO eve
// imports, NO I/O — just string parsing, so the channel's per-request auth
// walk stays allocation-light and the logic is independently assertable. It
// exists because @supabase/ssr itself can't run inside eve's nitro channel
// (it expects a framework cookie adapter). Format mirrored: the session lives
// in `sb-<ref>-auth-token` — possibly split into ordered chunks `.0`, `.1`, …
// — as `base64-` + base64url(JSON session) with an `access_token` field.
// Imported by agent/channels/eve.ts (the Supabase auth walk entry).

const BASE64_PREFIX = "base64-";

/** Cookie name the Supabase clients store the session under: `sb-<project ref>-auth-token` (ref = first hostname label of the project URL — mirrors supabase-js's defaultStorageKey). */
export function storageKeyForUrl(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

/** Parses a raw Cookie header into name → value, URI-decoding values when possible (the serializers encode; a value that fails to decode is kept raw). */
export function parseCookieHeader(header: string | null): Map<string, string> {
  const jar = new Map<string, string>();
  if (!header) return jar;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    const raw = part.slice(eq + 1).trim();
    // First occurrence wins, matching the `cookie` package @supabase/ssr reads
    // through: a duplicate `sb-*` cookie (other Path/Domain) must not shadow the
    // one the app itself resolves, or the channel would read a different session.
    if (jar.has(name)) continue;
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // not URI-encoded; keep the raw value
    }
    jar.set(name, value);
  }
  return jar;
}

/** Mirrors @supabase/ssr combineChunks: the whole cookie wins; else join `.0`,`.1`,… in order until the first gap. Null when neither form exists. */
export function combineChunks(jar: Map<string, string>, key: string): string | null {
  const whole = jar.get(key);
  if (whole) return whole;
  const chunks: string[] = [];
  for (let i = 0; ; i++) {
    const chunk = jar.get(`${key}.${i}`);
    if (!chunk) break;
    chunks.push(chunk);
  }
  return chunks.length > 0 ? chunks.join("") : null;
}

/** Extracts `access_token` from a reassembled cookie value — `base64-`-prefixed base64url(JSON) or legacy raw JSON. The whole session JSON must parse (mismatched chunk generations decode to garbage; a regex pick would return a corrupted token instead of null). Null on any malformation. */
export function accessTokenFromCookieValue(value: string): string | null {
  let json = value;
  if (value.startsWith(BASE64_PREFIX)) {
    try {
      json = Buffer.from(value.slice(BASE64_PREFIX.length), "base64url").toString("utf8");
    } catch {
      return null;
    }
  }
  try {
    const token = (JSON.parse(json) as { access_token?: unknown }).access_token;
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** Full read path: Cookie header → chunk reassembly → access token. `storageKey` comes from storageKeyForUrl, precomputed once by the caller (it's process-invariant). Null = no/invalid session cookie. */
export function supabaseAccessTokenFromRequest(
  request: Request,
  storageKey: string,
): string | null {
  const jar = parseCookieHeader(request.headers.get("cookie"));
  const value = combineChunks(jar, storageKey);
  return value ? accessTokenFromCookieValue(value) : null;
}
