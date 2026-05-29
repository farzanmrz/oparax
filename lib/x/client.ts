// X API v2 base URL.
const X_API = "https://api.x.com/2"

// Result of an X API call: ok with data, or a readable error + HTTP status.
export type XResult<T> = ({ ok: true } & T) | { ok: false; error: string; status: number }

/**
 * Extract a readable message from an X RFC-7807 error body.
 * @param status - the HTTP status
 * @param body - the parsed JSON error body (unknown shape)
 * @returns a readable error message
 */
function parseXError(status: number, body: unknown): string {

  // Cast the error body to its expected shape, or null if parsing failed.
  const record = body as {
    errors?: Array<{ detail?: string; title?: string }>
    detail?: string
    title?: string
  } | null

  return (
    record?.errors?.[0]?.detail ??
    record?.errors?.[0]?.title ??
    record?.detail ??
    record?.title ??
    `X API request failed (${status}).`
  )
}

/**
 * GET /2/users/me — identify the account behind an access token.
 * @param accessToken - a valid X access token
 * @returns the X user id + username, or a readable error
 */
export async function getMe(
  accessToken: string,
): Promise<XResult<{ id: string; username: string }>> {

  // Fetch the user identity endpoint.
  const response = await fetch(`${X_API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  // Parse the response body; null if JSON parsing failed.
  const body = (await response.json().catch(() => null)) as {
    data?: { id?: string; username?: string }
  } | null

  if (response.status !== 200 || !body?.data?.id || !body.data.username) {
    return { ok: false, error: parseXError(response.status, body), status: response.status }
  }
  return { ok: true, id: body.data.id, username: body.data.username }
}

/**
 * POST /2/tweets — publish a tweet. HTTP 201 on success.
 * @param accessToken - a valid X access token with tweet.write
 * @param text - the tweet body (already validated/stripped by the caller)
 * @returns the new tweet id + url, or a readable error
 */
export async function postTweet(
  accessToken: string,
  text: string,
): Promise<XResult<{ id: string; text: string; url: string }>> {

  // POST the tweet to the tweets endpoint.
  const response = await fetch(`${X_API}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })

  // Parse the response body; null if JSON parsing failed.
  const body = (await response.json().catch(() => null)) as {
    data?: { id?: string; text?: string }
  } | null

  if (response.status !== 201 || !body?.data?.id) {
    return { ok: false, error: parseXError(response.status, body), status: response.status }
  }

  // Extract the new tweet ID from the response.
  const id = body.data.id

  return {
    ok: true,
    id,
    text: body.data.text ?? text,
    url: `https://x.com/i/web/status/${id}`,
  }
}
