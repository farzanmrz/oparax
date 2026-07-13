import {
  type AuthFn,
  localDev,
  UnauthenticatedError,
  vercelOidc,
  verifyOidc,
} from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { storageKeyForUrl, supabaseAccessTokenFromRequest } from "../lib/supabase-cookies";

// Verifies the signed-in Supabase user from the sb-* auth cookies the browser
// already sends on same-origin /eve/v1/* requests. Verification is local —
// ES256 JWT against the project's JWKS (eve caches the discovery doc + key
// set per process) — no Supabase round-trip per message. The env-derived
// issuer and cookie key are computed once here, not per request: the factory
// runs at channel construction and the values are process-invariant.
function supabaseUser(): AuthFn<Request> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    // The eve service is a separate Vercel build from the Next app; if this key
    // is unset there, every reporter request would silently 401 (looking like a
    // bad cookie). On any Vercel deploy, fail loud with a coded 401 instead —
    // mirrors eve's own placeholderAuth signal. Local dev falls through to
    // localDev() as before.
    return () => {
      if (process.env.VERCEL) {
        throw new UnauthenticatedError({
          code: "supabase_auth_url_missing",
          message: "NEXT_PUBLIC_SUPABASE_URL is not set in the eve service.",
        });
      }
      return null;
    };
  }
  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const storageKey = storageKeyForUrl(supabaseUrl);
  return async (request) => {
    const token = supabaseAccessTokenFromRequest(request, storageKey);
    if (!token) return null;
    const result = await verifyOidc(token, { audiences: ["authenticated"], issuer });
    if (!result.ok) return null;
    // verifyOidc tags principals `service` with principalId `<iss>:<sub>`;
    // rebuild as the app user so user-scoped runtime auth sees a person.
    const sub = result.sessionAuth.subject;
    if (!sub) return null;
    return {
      attributes: result.sessionAuth.attributes,
      authenticator: "supabase",
      issuer,
      principalId: sub,
      principalType: "user",
      subject: sub,
    };
  };
}

export default eveChannel({
  auth: [supabaseUser(), vercelOidc(), localDev()],
});
