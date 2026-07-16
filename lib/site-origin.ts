// Resolves the site's public origin from request headers, for building absolute
// same-origin URLs (auth email redirects, OAuth redirect URIs). Prefers the `origin`
// header, falls back to the forwarded host + proto (Vercel/proxy), then localhost.
// A plain module (no "use server") so both Server Actions and Route Handlers can import
// it — a "use server" file may only EXPORT async actions, but it can freely IMPORT this.
import { headers } from "next/headers";

export async function getSiteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    return origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host) {
    const protocol =
      requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}
