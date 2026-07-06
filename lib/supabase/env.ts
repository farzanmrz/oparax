// Reads the public Supabase env vars once, failing fast if either is missing.
// Uses LITERAL process.env access so Next.js inlines NEXT_PUBLIC_* into the
// browser bundle — a dynamic process.env[name] lookup would not be inlined and
// would read undefined on the client.
export function supabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return { url, key };
}
