// Imports
import { NextResponse } from "next/server";
import { agentConfigSchema, configToColumns } from "@/lib/chat/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Update one saved agent's editable settings. RLS scopes the row to the owner;
 * the explicit user_id checks keep duplicate-name validation tight.
 * Accepts `{ config: AgentConfig }` and validates via the zod schema before
 * writing all config columns to the database.
 * @param req - request with `{ config: AgentConfig }`
 * @param context.params - dynamic agent id
 * @returns `{ ok: true }`, or a JSON error
 */
export async function PATCH(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await context.params;
  const supabase = await createClient();
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON.",
      },
      {
        status: 400,
      },
    );
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      {
        error: "Invalid body.",
      },
      {
        status: 400,
      },
    );
  }

  // Validate the config object via zod.
  const parsed = agentConfigSchema.safeParse((body as Record<string, unknown>).config);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid config.",
      },
      {
        status: 400,
      },
    );
  }
  const config = parsed.data;

  // No-duplicate-name check (excluding self).
  const { data: existingAgents, error: existingError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", config.name)
    .neq("id", id)
    .limit(1);

  if (existingError) {
    return NextResponse.json(
      {
        error: "Failed to check existing agents.",
      },
      {
        status: 500,
      },
    );
  }
  if ((existingAgents ?? []).length > 0) {
    return NextResponse.json(
      {
        error: "An agent with this name already exists.",
      },
      {
        status: 409,
      },
    );
  }

  // Build the update payload from config; exclude user_id (ownership is fixed).
  const { user_id: _omit, ...updateColumns } = configToColumns(config, user.id);

  const { data, error } = await supabase
    .from("agents")
    .update(updateColumns)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle<{
      id: string;
    }>();

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to save agent.",
      },
      {
        status: 500,
      },
    );
  }
  if (!data) {
    return NextResponse.json(
      {
        error: "Agent not found.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
