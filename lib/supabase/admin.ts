import "server-only";

// Service-role Supabase client. SERVER-ONLY: bypasses RLS for trusted server work.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Generated RPC types omit SQL argument nullability; these arguments accept null in the migration.
type AdminDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Omit<Database["public"]["Functions"], "reserve_cost"> & {
      reserve_cost: {
        Args: {
          p_service: string;
          p_kind: string;
          p_usd: number;
          p_monitor: string | null;
          p_source: string | null;
          p_run: string | null;
        };
        Returns: number | null;
      };
    };
  };
};

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing Supabase admin env (URL / SUPABASE_SECRET_KEY).");
  return createClient<AdminDatabase>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
