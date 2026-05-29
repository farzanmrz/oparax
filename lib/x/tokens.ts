// Imports
import crypto from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

// Encryption algorithm and IV size for AES-256-GCM.
const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12

/**
 * Derive a 32-byte AES key from X_TOKEN_ENC_KEY (sha256 normalizes any input).
 * @returns the 32-byte key buffer
 */
function getKey(): Buffer {
  const raw = process.env.X_TOKEN_ENC_KEY
  if (!raw) {
    throw new Error("X_TOKEN_ENC_KEY is not set.")
  }
  return crypto.createHash("sha256").update(raw).digest()
}

/**
 * Encrypt a token at rest with AES-256-GCM.
 * @param plaintext - the token to encrypt
 * @returns base64 "iv:tag:ciphertext"
 */
export function encrypt(plaintext: string): string {

  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

/**
 * Decrypt a token produced by encrypt().
 * @param payload - the stored "iv:tag:ciphertext" string
 * @returns the decrypted plaintext token
 */
export function decrypt(payload: string): string {

  const [ivB64, tagB64, dataB64] = payload.split(":")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted token.")
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64"),
  )
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

// Fields needed to save an X connection (tokens encrypted before storage).
export interface SaveConnectionInput {
  userId: string
  xUserId: string
  xUsername: string
  accessToken: string
  refreshToken: string
  scopes: string[]
  expiresAt: string
}

/**
 * Upsert the user's X connection, encrypting both tokens before storage.
 * One X account per user (unique user_id), so upsert on conflict.
 * @param supabase - a server Supabase client (RLS owner-scoped)
 * @param input - the captured connection fields
 * @returns the Supabase error, or null on success
 */
export async function saveConnection(
  supabase: SupabaseClient,
  input: SaveConnectionInput,
): Promise<Error | null> {
  const { error } = await supabase.from("x_connections").upsert(
    {
      user_id: input.userId,
      x_user_id: input.xUserId,
      x_username: input.xUsername,
      access_token: encrypt(input.accessToken),
      refresh_token: encrypt(input.refreshToken),
      scopes: input.scopes,
      expires_at: input.expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  return error
}

// X OAuth2 token endpoint.
const X_TOKEN_ENDPOINT = "https://api.x.com/2/oauth2/token"

// Refresh slightly before expiry to avoid edge-case failures.
const EXPIRY_BUFFER_MS = 60_000

// Encrypted token row fields needed to decide if a refresh is required.
interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

/**
 * Whether a stored access token is expired (or within the refresh buffer).
 * @param expiresAt - ISO expiry timestamp
 * @returns true if the token should be refreshed now
 */
export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() - EXPIRY_BUFFER_MS <= Date.now()
}

/**
 * Exchange a refresh token for a new access token via X's confidential-client
 * token endpoint. X rotates the refresh token, so the caller must persist the
 * returned refreshToken.
 * @param refreshToken - the current (decrypted) refresh token
 * @returns the new access + rotated refresh token and the new expiry
 */
export async function rotateAccessToken(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: string
}> {

  // X OAuth credentials for the confidential-client refresh flow.
  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("X_CLIENT_ID / X_CLIENT_SECRET are not set.")
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const response = await fetch(X_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`X token refresh failed (${response.status}): ${detail}`)
  }

  const json = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
  if (!json.access_token || !json.refresh_token) {
    throw new Error("X token refresh returned no tokens.")
  }

  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 7200
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  }
}

/**
 * Return a valid X access token for a user: decrypt the stored one and reuse it
 * if still fresh, otherwise refresh, persist the rotated refresh token + new
 * expiry (re-encrypted), and return the new access token.
 * @param supabase - a server Supabase client (RLS owner-scoped)
 * @param userId - the connection owner
 * @returns a usable (decrypted) access token
 */
export async function getFreshAccessToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("x_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single()
  if (error || !data) {
    throw new Error("No X connection for this user.")
  }
  const stored = data as StoredTokens

  // Reuse the decrypted access token if still fresh (no network call).
  if (!isExpired(stored.expires_at)) {
    return decrypt(stored.access_token)
  }

  // Expired: refresh, then persist the rotated tokens re-encrypted.
  const rotated = await rotateAccessToken(decrypt(stored.refresh_token))
  const { error: updateError } = await supabase
    .from("x_connections")
    .update({
      access_token: encrypt(rotated.accessToken),
      refresh_token: encrypt(rotated.refreshToken),
      expires_at: rotated.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
  if (updateError) {
    throw new Error("Failed to persist refreshed X tokens.")
  }

  return rotated.accessToken
}
