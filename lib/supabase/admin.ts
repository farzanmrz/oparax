// Service-role Supabase client — bypasses RLS. SERVER-ONLY: imported by code that must
// write rows no user session can — the cron dispatcher (a tick is not a request from a
// signed-in reporter), the `[id]` desk actions' service-role writes, and `lib/x/`'s token
// store + post/unlink actions (the deny-all `x_accounts` table + the drafts post-state stamp).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing Supabase admin env (URL / SUPABASE_SECRET_KEY).");
  return createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
