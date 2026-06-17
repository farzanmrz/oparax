import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Resolve auth user ids → email addresses via the service-role admin API.
 * Used to label the cost dashboard with real emails instead of raw UUIDs.
 * Best-effort: any failure yields an empty map (labels fall back to short ids).
 */
export async function fetchUserEmails(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const admin = createServiceRoleClient().auth.admin;
    // Page through users (50/page default). Small user base today, but page anyway.
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        if (u.email) map.set(u.id, u.email);
      }
      if (data.users.length < 200) break;
    }
  } catch (error) {
    console.error("fetchUserEmails failed", error);
  }
  return map;
}
