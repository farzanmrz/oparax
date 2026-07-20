// lib/x/api.ts
//
// Raw-fetch client for X's OAuth2 + posting endpoints (NOT an SDK dependency) —
// mirrors lib/agent/xai.ts's raw-fetch precedent: env read fail-fast,
// AbortSignal.timeout, non-OK -> Error with status + truncated body. Pure module:
// no Supabase, no Next.js, no React, no I/O beyond fetch.

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_REVOKE_URL = "https://api.x.com/2/oauth2/revoke";
const X_API = "https://api.x.com/2";

export const X_SCOPES = "tweet.read tweet.write users.read offline.access";

/** One token grant from X's token endpoint. `refreshToken` is null when a refresh
 *  response omits it (rotation undocumented — caller keeps the prior one). */
export type XTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number;
  scope: string;
};

type XTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

type XMeResponse = { data: { id: string; username: string; name: string } };

type XCreateTweetResponse = { data: { id: string; text: string } };

/** Reads X_CLIENT_ID / X_CLIENT_SECRET and returns the Basic auth header value for
 *  the confidential-client (Web App) token/revoke endpoints. */
function xBasicAuth(): { clientId: string; header: string } {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("X_CLIENT_ID / X_CLIENT_SECRET is not set");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return { clientId, header: `Basic ${basic}` };
}

/** Runs `fetch`, hard-timing-out at 15s and rethrowing a clear Error on
 *  TimeoutError/AbortError (xai.ts pattern) so a stalled X call fails fast instead
 *  of hanging indefinitely. */
async function xFetch(endpoint: string, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(`X ${endpoint} timed out after 15s`);
    }
    throw err;
  }
}

async function assertOk(endpoint: string, res: Response): Promise<void> {
  if (res.ok) return;
  const text = await res.text();
  throw new Error(`X ${endpoint} ${res.status}: ${text.slice(0, 500)}`);
}

/** Builds the X OAuth2 authorize URL (pure string building — no fetch). */
export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
  const { clientId } = xBasicAuth();
  const search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: params.redirectUri,
    scope: X_SCOPES,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${X_AUTHORIZE_URL}?${search.toString()}`;
}

/** POSTs a form body to X's token endpoint (Basic auth) and normalizes the grant.
 *  Shared by the auth-code exchange and the refresh — they differ only in the body.
 *  `refresh_token` MAY be absent on a refresh (rotation undocumented) → null, and the
 *  caller keeps the prior one. */
async function tokenRequest(body: URLSearchParams): Promise<XTokenSet> {
  const { header } = xBasicAuth();
  const res = await xFetch("/2/oauth2/token", X_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: header,
    },
    body: body.toString(),
  });
  await assertOk("/2/oauth2/token", res);
  const json = (await res.json()) as XTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresInSec: json.expires_in,
    scope: json.scope,
  };
}

export function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<XTokenSet> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<XTokenSet> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export async function revokeToken(token: string): Promise<void> {
  const { header } = xBasicAuth();
  const body = new URLSearchParams({ token }).toString();

  const res = await xFetch("/2/oauth2/revoke", X_REVOKE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: header,
    },
    body,
  });
  await assertOk("/2/oauth2/revoke", res);
}

export async function fetchMe(accessToken: string): Promise<{ id: string; username: string }> {
  const res = await xFetch("/2/users/me", `${X_API}/users/me`, {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  await assertOk("/2/users/me", res);
  const json = (await res.json()) as XMeResponse;
  return { id: json.data.id, username: json.data.username };
}

export async function createTweet(accessToken: string, text: string): Promise<{ id: string }> {
  const res = await xFetch("/2/tweets", `${X_API}/tweets`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text }),
  });
  await assertOk("/2/tweets", res);
  const json = (await res.json()) as XCreateTweetResponse;
  return { id: json.data.id };
}
