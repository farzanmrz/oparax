/**
 * Whether a `?next=` redirect target is a safe same-origin relative path.
 *
 * Rejects anything that could escape the origin when handed to `new URL(next,
 * origin)` or `redirect(next)`:
 *  - missing / non-`/`-prefixed values (absolute or scheme-relative URLs),
 *  - `//…` (protocol-relative → another host),
 *  - backslashes (the WHATWG URL parser treats `\` as `/`, so `/\evil.com`
 *    resolves to `https://evil.com`), and
 *  - control characters (CR/LF/TAB inside the path can smuggle the same escape).
 *
 * Callers still apply their own allow/deny rules (e.g. no `/login`) and default
 * on top of this. Shared so the auth callback and the connect-x gate can't drift.
 *
 * @param next - the requested next path (raw, untrusted)
 * @returns true only for a safe same-origin relative path
 */
export function isSafeNextPath(next: string | null | undefined): next is string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return false;
  if (/[\\\x00-\x1f]/.test(next)) return false;
  return true;
}
