// X API v2 base URL.
const X_API = "https://api.x.com/2";

// Result of an X API call: ok with data, or a readable error + HTTP status.
export type XResult<T> =
  | ({
      ok: true;
    } & T)
  | {
      ok: false;
      error: string;
      status: number;
    };

/**
 * Extract a readable message from an X RFC-7807 error body.
 * @param status - the HTTP status
 * @param body - the parsed JSON error body (unknown shape)
 * @returns a readable error message
 */
function parseXError(status: number, body: unknown): string {
  // Cast the error body to its expected shape, or null if parsing failed.
  const record = body as {
    errors?: Array<{
      detail?: string;
      title?: string;
    }>;
    detail?: string;
    title?: string;
  } | null;

  return (
    record?.errors?.[0]?.detail ??
    record?.errors?.[0]?.title ??
    record?.detail ??
    record?.title ??
    `X API request failed (${status}).`
  );
}

/**
 * GET /2/users/me — identify the account behind an access token.
 * @param accessToken - a valid X access token
 * @returns the X user id + username, or a readable error
 */
export async function getMe(accessToken: string): Promise<
  XResult<{
    id: string;
    username: string;
  }>
> {
  // Fetch the user identity endpoint.
  const response = await fetch(`${X_API}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Parse the response body; null if JSON parsing failed.
  const body = (await response.json().catch(() => null)) as {
    data?: {
      id?: string;
      username?: string;
    };
  } | null;

  if (response.status !== 200 || !body?.data?.id || !body.data.username) {
    return {
      ok: false,
      error: parseXError(response.status, body),
      status: response.status,
    };
  }
  return {
    ok: true,
    id: body.data.id,
    username: body.data.username,
  };
}

/**
 * GET /2/users/by?usernames=… — look up up to 100 usernames in one batch call.
 * Uses App-Only Bearer auth (not user OAuth). Returns the matching users with
 * their id, username, display name, and protected status.
 * @param bearer - the App-Only Bearer token (X_BEARER_TOKEN)
 * @param usernames - 1–100 already-normalized usernames (no @)
 * @returns the matching user records, or a readable error
 */
export async function getUsersByUsernames(
  bearer: string,
  usernames: string[],
): Promise<
  XResult<{
    users: {
      id: string;
      username: string;
      name: string;
      protected: boolean;
    }[];
  }>
> {
  const qs = new URLSearchParams({
    usernames: usernames.join(","),
    "user.fields": "protected",
  });
  const response = await fetch(`${X_API}/users/by?${qs}`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
    },
  });

  const body = (await response.json().catch(() => null)) as {
    data?: {
      id: string;
      username: string;
      name: string;
      protected?: boolean;
    }[];
  } | null;

  if (response.status !== 200 || !body) {
    return {
      ok: false,
      error: parseXError(response.status, body),
      status: response.status,
    };
  }

  const users = (body.data ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    protected: u.protected ?? false,
  }));

  return {
    ok: true,
    users,
  };
}

// One tweet as returned by the lookup/timeline endpoints. `note_tweet.text`
// carries the full body for long (>280 char) posts; prefer it when present.
interface RawTweet {
  id: string;
  text?: string;
  note_tweet?: {
    text?: string;
  };
}

/** Resolve a tweet's display text: full note_tweet body if present, else text. */
function tweetText(t: RawTweet): string {
  const note = t.note_tweet?.text;
  if (typeof note === "string" && note.trim()) return note;
  return typeof t.text === "string" ? t.text : "";
}

/**
 * GET /2/tweets?ids=… — look up up to 100 tweets by id in one batch call.
 * Accepts either the app bearer (public read) or a user's OAuth token (with
 * tweet.read, also returns protected tweets that user can view). Returns each
 * found tweet's id + resolved text (note_tweet.text for long posts, else text).
 * @param bearer - the app bearer (X_BEARER_TOKEN) or a user OAuth access token
 * @param ids - 1–100 numeric tweet ids
 * @returns the found tweets (id + text), or a readable error
 */
export async function getTweetsByIds(
  bearer: string,
  ids: string[],
): Promise<
  XResult<{
    tweets: {
      id: string;
      text: string;
    }[];
  }>
> {
  const qs = new URLSearchParams({
    ids: ids.join(","),
    "tweet.fields": "text,note_tweet",
  });
  const response = await fetch(`${X_API}/tweets?${qs}`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
    },
    signal: AbortSignal.timeout(8000),
  });

  const body = (await response.json().catch(() => null)) as {
    data?: RawTweet[];
  } | null;

  if (response.status !== 200 || !body) {
    return {
      ok: false,
      error: parseXError(response.status, body),
      status: response.status,
    };
  }

  const tweets = (body.data ?? [])
    .map((t) => ({ id: t.id, text: tweetText(t) }))
    .filter((t) => t.text);

  return {
    ok: true,
    tweets,
  };
}

/**
 * GET /2/users/:id/tweets — a user's recent original posts. Accepts the app bearer
 * (public read) or a user's OAuth token (with tweet.read, also returns the user's
 * own / protected-followed posts). Excludes retweets + replies and resolves each
 * tweet's full text (note_tweet.text for long posts).
 * @param bearer - the app bearer (X_BEARER_TOKEN) or a user OAuth access token
 * @param userId - the X user id whose timeline to read
 * @param maxResults - page size (X allows 5–100; defaults to 10)
 * @returns the recent original tweets' text, or a readable error
 */
export async function getUserTweets(
  bearer: string,
  userId: string,
  maxResults = 10,
): Promise<
  XResult<{
    tweets: {
      id: string;
      text: string;
    }[];
  }>
> {
  const qs = new URLSearchParams({
    max_results: String(maxResults),
    "tweet.fields": "text,note_tweet",
    exclude: "retweets,replies",
  });
  const response = await fetch(`${X_API}/users/${userId}/tweets?${qs}`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
    },
    signal: AbortSignal.timeout(8000),
  });

  const body = (await response.json().catch(() => null)) as {
    data?: RawTweet[];
  } | null;

  if (response.status !== 200 || !body) {
    return {
      ok: false,
      error: parseXError(response.status, body),
      status: response.status,
    };
  }

  const tweets = (body.data ?? [])
    .map((t) => ({ id: t.id, text: tweetText(t) }))
    .filter((t) => t.text);

  return {
    ok: true,
    tweets,
  };
}

/**
 * GET /2/users/by/username/:username — resolve a username to its X user id.
 * Accepts the app bearer or a user's OAuth token. Used when only the username is known.
 * @param bearer - the app bearer (X_BEARER_TOKEN) or a user OAuth access token
 * @param username - the username to resolve (no leading @)
 * @returns the user's id + username, or a readable error
 */
export async function getUserByUsername(
  bearer: string,
  username: string,
): Promise<
  XResult<{
    id: string;
    username: string;
  }>
> {
  const response = await fetch(`${X_API}/users/by/username/${encodeURIComponent(username)}`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
    },
    signal: AbortSignal.timeout(8000),
  });

  const body = (await response.json().catch(() => null)) as {
    data?: {
      id?: string;
      username?: string;
    };
  } | null;

  if (response.status !== 200 || !body?.data?.id || !body.data.username) {
    return {
      ok: false,
      error: parseXError(response.status, body),
      status: response.status,
    };
  }

  return {
    ok: true,
    id: body.data.id,
    username: body.data.username,
  };
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
): Promise<
  XResult<{
    id: string;
    text: string;
    url: string;
  }>
> {
  // POST the tweet to the tweets endpoint.
  const response = await fetch(`${X_API}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
    }),
  });

  // Parse the response body; null if JSON parsing failed.
  const body = (await response.json().catch(() => null)) as {
    data?: {
      id?: string;
      text?: string;
    };
  } | null;

  if (response.status !== 201 || !body?.data?.id) {
    return {
      ok: false,
      error: parseXError(response.status, body),
      status: response.status,
    };
  }

  // Extract the new tweet ID from the response.
  const id = body.data.id;

  return {
    ok: true,
    id,
    text: body.data.text ?? text,
    url: `https://x.com/i/web/status/${id}`,
  };
}
