import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const xSubject = z.string().regex(/^[0-9]+$/);
const xHandle = z.string().regex(/^[A-Za-z0-9_]{1,15}$/);
const xIdentityEnvelope = z.object({
  provider: z.literal("x"),
  provider_id: z.unknown().optional(),
  identity_data: z
    .object({
      sub: z.unknown().optional(),
      user_name: z.unknown().optional(),
      preferred_username: z.unknown().optional(),
    })
    .passthrough()
    .optional(),
});

type InvalidReason = "missing_subject" | "invalid_subject" | "missing_handle" | "invalid_handle";

export type XIdentity =
  | { status: "absent" }
  | { status: "invalid"; reason: InvalidReason }
  | { status: "ok"; xUserId: string; handle: string; displayHandle: string };

function parseXIdentity(identity: unknown): XIdentity {
  const parsed = xIdentityEnvelope.safeParse(identity);
  if (!parsed.success) return { status: "invalid", reason: "missing_subject" };

  const { provider_id, identity_data } = parsed.data;
  const subjectCandidates = [
    ["provider_id", provider_id],
    ["identity_data.sub", identity_data?.sub],
  ] as const;
  let xUserId: string | null = null;
  for (const [, value] of subjectCandidates) {
    const parsedSubject = xSubject.safeParse(value);
    if (parsedSubject.success) {
      xUserId = parsedSubject.data;
      break;
    }
  }
  if (!xUserId) {
    return {
      status: "invalid",
      reason: subjectCandidates.some(([, value]) => value !== undefined)
        ? "invalid_subject"
        : "missing_subject",
    };
  }

  const handleCandidates = [
    ["identity_data.user_name", identity_data?.user_name],
    ["identity_data.preferred_username", identity_data?.preferred_username],
  ] as const;
  let displayHandle: string | null = null;
  for (const [, value] of handleCandidates) {
    const parsedHandle = xHandle.safeParse(value);
    if (parsedHandle.success) {
      displayHandle = parsedHandle.data;
      break;
    }
  }
  if (!displayHandle) {
    return {
      status: "invalid",
      reason: handleCandidates.some(([, value]) => value !== undefined)
        ? "invalid_handle"
        : "missing_handle",
    };
  }

  return {
    status: "ok",
    xUserId,
    handle: displayHandle.toLowerCase(),
    displayHandle,
  };
}

export async function readAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, monitor: null, xIdentity: { status: "absent" } as const };

  const { data: monitor, error } = await supabase
    .from("monitors")
    .select("id,handle,display_handle,x_user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;

  const identity = user.identities?.find((item) => item.provider === "x");
  return {
    user,
    monitor,
    xIdentity: identity ? parseXIdentity(identity) : ({ status: "absent" } as const),
  };
}
