import { isValidHandle, normalizeHandle } from "@/lib/scan/handles";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logUsage } from "@/lib/usage/log";
import { getUsersByUsernames } from "@/lib/x/client";

// How long a cached row stays fresh before we re-check with the X API.
const CACHE_TTL_DAYS = 30;

export interface VerifiedHandle {
  username: string;
  id: string | null;
  name: string | null;
  protected: boolean;
}

export interface VerifyHandlesResult {
  /** Handles that exist on X (or are soft-unverified cache misses). */
  valid: VerifiedHandle[];
  /** Handles that are syntactically invalid OR confirmed absent by the X API. */
  invalid: string[];
  /** True when the input was empty after normalization. */
  describedOnly: boolean;
  /** True when at least one handle was accepted without API confirmation. */
  softUnverified: boolean;
}

/**
 * Verify a list of X handles against the site-wide `verified_x_handles` cache
 * and, on cache misses, against the X API (App-Only Bearer). Gracefully
 * degrades when `X_BEARER_TOKEN` is unset or the API call fails: format-valid
 * misses are accepted as `valid` with `softUnverified: true` — no throw.
 *
 * @param handles - raw handle strings (may include leading @, whitespace)
 * @returns the verification result grouped into valid/invalid buckets
 */
export async function verifyHandles(handles: string[]): Promise<VerifyHandlesResult> {
  // --- 1. Normalize + format-validate ---
  const normalized = handles.map(normalizeHandle).filter(Boolean);

  if (normalized.length === 0) {
    return {
      valid: [],
      invalid: [],
      describedOnly: true,
      softUnverified: false,
    };
  }

  const formatValid: string[] = [];
  const formatInvalid: string[] = [];

  for (const h of normalized) {
    if (isValidHandle(h)) {
      formatValid.push(h);
    } else {
      formatInvalid.push(h);
    }
  }

  const valid: VerifiedHandle[] = [];
  let softUnverified = false;

  if (formatValid.length === 0) {
    return {
      valid: [],
      invalid: formatInvalid,
      describedOnly: false,
      softUnverified: false,
    };
  }

  // --- 2. Cache lookup ---
  const supabase = createServiceRoleClient();

  // citext makes the comparison case-insensitive in Postgres.
  const { data: cachedRows, error: cacheError } = await supabase
    .from("verified_x_handles")
    .select("x_user_id, username, name, protected, last_checked_at")
    .in("username", formatValid);

  const cachedByUsername = new Map<
    string,
    {
      x_user_id: string;
      username: string;
      name: string | null;
      protected: boolean;
      last_checked_at: string;
    }
  >();

  if (!cacheError && cachedRows) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CACHE_TTL_DAYS);

    for (const row of cachedRows) {
      const checkedAt = new Date(row.last_checked_at);
      if (checkedAt >= cutoff) {
        // Fresh cache hit — accept without hitting the API.
        // `row.username` is citext in Postgres but comes back as a string here.
        cachedByUsername.set((row.username as string).toLowerCase(), {
          x_user_id: row.x_user_id,
          username: row.username as string,
          name: row.name,
          protected: row.protected,
          last_checked_at: row.last_checked_at,
        });
      }
    }
  }

  const cacheHitUsernames = new Set(cachedByUsername.keys());
  const cacheMisses = formatValid.filter((h) => !cacheHitUsernames.has(h.toLowerCase()));

  // Populate valids from cache hits.
  for (const [, row] of cachedByUsername) {
    valid.push({
      username: row.username as string,
      id: row.x_user_id,
      name: row.name,
      protected: row.protected,
    });
  }

  // --- 3. API call for cache misses ---
  const bearer = process.env.X_BEARER_TOKEN;

  if (cacheMisses.length > 0) {
    if (!bearer) {
      // Graceful degradation: no token — accept all format-valid misses as soft-valid.
      for (const h of cacheMisses) {
        valid.push({
          username: h,
          id: null,
          name: null,
          protected: false,
        });
      }
      softUnverified = true;
    } else {
      let apiSuccess = false;

      try {
        const result = await getUsersByUsernames(bearer, cacheMisses);

        if (result.ok) {
          apiSuccess = true;
          const returnedByUsername = new Map(
            result.users.map((u) => [u.username.toLowerCase(), u]),
          );

          // Set-difference: misses present in API response → valid; absent → invalid.
          const apiValid: typeof result.users = [];
          const apiInvalid: string[] = [];

          for (const h of cacheMisses) {
            const found = returnedByUsername.get(h.toLowerCase());
            if (found) {
              apiValid.push(found);
            } else {
              apiInvalid.push(h);
            }
          }

          for (const u of apiValid) {
            valid.push({
              username: u.username,
              id: u.id,
              name: u.name,
              protected: u.protected,
            });
          }
          formatInvalid.push(...apiInvalid);

          // Upsert confirmed-valid handles into the cache + log X API usage in parallel.
          const now = new Date().toISOString();
          await Promise.all([
            apiValid.length > 0
              ? supabase.from("verified_x_handles").upsert(
                  apiValid.map((u) => ({
                    x_user_id: u.id,
                    username: u.username,
                    name: u.name,
                    protected: u.protected,
                    verified_at: now,
                    last_checked_at: now,
                  })),
                  {
                    onConflict: "x_user_id",
                  },
                )
              : Promise.resolve(),
            logUsage({
              kind: "x_verify",
              provider: "x_api",
              tool_name: "verifyHandles",
              verifyCount: cacheMisses.length,
              metadata: {
                checked: cacheMisses.length,
              },
            }),
          ]);
        }
      } catch {
        // API call itself threw — fall through to degradation below.
      }

      if (!apiSuccess) {
        // Graceful degradation: API failed — accept format-valid misses as soft-valid.
        for (const h of cacheMisses) {
          valid.push({
            username: h,
            id: null,
            name: null,
            protected: false,
          });
        }
        softUnverified = true;
      }
    }
  }

  return {
    valid,
    invalid: formatInvalid,
    describedOnly: false,
    softUnverified,
  };
}
