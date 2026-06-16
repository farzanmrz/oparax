// Imports
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Next.js runtime: Node.js (not Edge).
export const runtime = "nodejs";

/**
 * Disconnect X: unlink the Supabase Auth 'x' identity, then delete the user's
 * x_connections row. RLS already scopes the delete to the owner; eq(user_id) is
 * explicit. Token revocation at X is optional (SPEC §3.1) and skipped for slice
 * 1 — the access token expires in ~2h.
 * @returns ok, or a JSON error
 */
export async function POST() {
  // Supabase client scoped to this request.
  const supabase = await createClient();

  // Get the authenticated user; fail if not signed in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();

  if (identitiesError) {
    return NextResponse.json(
      {
        error: "Failed to read linked X account.",
      },
      {
        status: 500,
      },
    );
  }

  const xIdentity = identities.identities.find((identity) => identity.provider === "x");

  if (xIdentity) {
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(xIdentity);

    if (unlinkError) {
      return NextResponse.json(
        {
          error: "Failed to unlink X from your account.",
        },
        {
          status: 500,
        },
      );
    }
  }

  // Delete the x_connections row; RLS scopes it to the owner.
  const { error } = await supabase.from("x_connections").delete().eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to disconnect.",
      },
      {
        status: 500,
      },
    );
  }

  const { error: agentsError } = await supabase
    .from("agents")
    .update({
      status: "inactive",
    })
    .eq("user_id", user.id);

  if (agentsError) {
    return NextResponse.json(
      {
        error: "Disconnected X, but failed to mark agents inactive.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
