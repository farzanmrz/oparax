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
