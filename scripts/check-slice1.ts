// THROWAWAY verification (SPEC §8) — run via `npx tsx scripts/check-slice1.ts`.
// NOT committed. Covers weighted char count, draft validation, dedupe_key.
import { TWEET_WEIGHTED_LIMIT, weightedLength } from "@/lib/draft/count"
import { getDraftIssue } from "@/lib/draft/validate"
import { toStoryDraft } from "@/lib/scan/parse"
import { decrypt, encrypt, getFreshAccessToken } from "@/lib/x/tokens"

let failures = 0

function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`)
  if (!cond) failures++
}

// weighted count
check("ascii length 5", weightedLength("hello") === 5, `got ${weightedLength("hello")}`)
check(
  "url weighs 23",
  weightedLength("https://example.com/abc") === 23,
  `got ${weightedLength("https://example.com/abc")}`,
)
check("emoji weighs 2", weightedLength("😀") === 2, `got ${weightedLength("😀")}`)

// validate
check("empty → issue", getDraftIssue("   ") === "Draft is empty.")
check("clean → null", getDraftIssue("Breaking: a clean tweet about the trade.") === null)
check("raw url → issue", getDraftIssue("see https://x.com/foo/status/1") !== null)
check("markdown → issue", getDraftIssue("**bold** headline") !== null)
check(
  ">280 weighted → issue",
  getDraftIssue("a".repeat(281)) ===
    `Draft exceeds ${TWEET_WEIGHTED_LIMIT} weighted characters.`,
)

// dedupe_key
const withTweet = toStoryDraft({
  title: "T",
  body: "B",
  urls: ["https://x.com/AdamSchefter/status/123", "https://espn.com/x"],
  draft: "Draft text",
})
check("dedupeKey = tweet id", withTweet.dedupeKey === "123", `got ${withTweet.dedupeKey}`)
check(
  "primaryTweetUrl = x status url",
  withTweet.primaryTweetUrl === "https://x.com/AdamSchefter/status/123",
)
const noTweet = toStoryDraft({
  title: "Only non-x",
  body: "B",
  urls: ["https://espn.com/a"],
  draft: "Draft text",
})
check(
  "no x url → dedupeKey falls back to first url (not empty)",
  noTweet.dedupeKey === "https://espn.com/a",
  `got "${noTweet.dedupeKey}"`,
)

// AES-256-GCM token encryption (X_TOKEN_ENC_KEY set via the run command)
const secret = "provider-access-token-abc123"
check("aes roundtrip", decrypt(encrypt(secret)) === secret)
check("ciphertext != plaintext", encrypt(secret) !== secret)
check("random iv → distinct ciphertexts", encrypt(secret) !== encrypt(secret))

// Token refresh/rotation: fake supabase builder + mocked fetch (no real X call)
function makeFakeSupabase(conn: {
  access_token: string
  refresh_token: string
  expires_at: string
}) {
  const state = { conn: { ...conn }, updateCalls: 0 }
  const builder = {
    select: () => builder,
    eq: () => builder,
    single: async () => ({ data: state.conn, error: null }),
    update: (values: Record<string, unknown>) => {
      state.updateCalls += 1
      state.conn = { ...state.conn, ...values } as typeof state.conn
      return { eq: async () => ({ error: null }) }
    },
  }
  const client = { from: () => builder } as unknown as Parameters<
    typeof getFreshAccessToken
  >[0]
  return { client, state }
}

async function testRefresh() {
  const originalFetch = global.fetch

  // Expired → refresh returns + persists rotated tokens
  global.fetch = (async () => ({
    ok: true,
    json: async () => ({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 7200,
    }),
    text: async () => "",
  })) as unknown as typeof fetch
  const expired = makeFakeSupabase({
    access_token: encrypt("old-access"),
    refresh_token: encrypt("old-refresh"),
    expires_at: new Date(Date.now() - 1000).toISOString(),
  })
  const refreshed = await getFreshAccessToken(expired.client, "user-1")
  check("expired → new access token", refreshed === "new-access", `got ${refreshed}`)
  check("expired → persisted once", expired.state.updateCalls === 1)
  check(
    "expired → rotated refresh token stored",
    decrypt(expired.state.conn.refresh_token) === "new-refresh",
  )
  check(
    "expired → new expiry in the future",
    new Date(expired.state.conn.expires_at).getTime() > Date.now(),
  )

  // Fresh → reuse without any network call
  let fetchCalled = false
  global.fetch = (async () => {
    fetchCalled = true
    throw new Error("should not fetch when fresh")
  }) as unknown as typeof fetch
  const fresh = makeFakeSupabase({
    access_token: encrypt("valid-access"),
    refresh_token: encrypt("valid-refresh"),
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  })
  const reused = await getFreshAccessToken(fresh.client, "user-1")
  check("fresh → reused access token", reused === "valid-access", `got ${reused}`)
  check("fresh → no network refresh", fetchCalled === false)
  check("fresh → no update", fresh.state.updateCalls === 0)

  global.fetch = originalFetch
}

void testRefresh().then(() => {
  console.log(
    failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
  )
  process.exit(failures === 0 ? 0 : 1)
})
