// Imports
import { NextResponse } from "next/server";
import { isValidHandle, MONITOR_MAX_HANDLES, normalizeHandle } from "@/lib/scan/handles";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Update one saved agent's editable settings. RLS scopes the row to the owner;
 * the explicit user_id checks keep duplicate-name validation tight.
 * @param req - request with agent settings
 * @param context.params - dynamic agent id
 * @returns ok, or a JSON error
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
  const record = body as Record<string, unknown>;

  const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : "";
  const monitoringDescription =
    typeof record.monitoringDescription === "string" ? record.monitoringDescription.trim() : "";
  const draftingInstructions =
    typeof record.draftingInstructions === "string" ? record.draftingInstructions.trim() : "";
  const rawHandles = Array.isArray(record.handles) ? record.handles : [];
  const seenHandles = new Set<string>();
  const handles = rawHandles
    .filter((handle): handle is string => typeof handle === "string")
    .map(normalizeHandle)
    .filter((handle) => {
      const key = handle.toLowerCase();
      if (!handle || seenHandles.has(key)) return false;
      seenHandles.add(key);
      return true;
    });

  if (!name) {
    return NextResponse.json(
      {
        error: "Agent name is required.",
      },
      {
        status: 400,
      },
    );
  }
  if (handles.length === 0) {
    return NextResponse.json(
      {
        error: "Add at least one X account to monitor.",
      },
      {
        status: 400,
      },
    );
  }
  if (handles.length > MONITOR_MAX_HANDLES) {
    return NextResponse.json(
      {
        error: `Use ${MONITOR_MAX_HANDLES} or fewer X accounts.`,
      },
      {
        status: 400,
      },
    );
  }
  const invalidHandle = handles.find((handle) => !isValidHandle(handle));
  if (invalidHandle) {
    return NextResponse.json(
      {
        error: `@${invalidHandle} is not a valid X handle.`,
      },
      {
        status: 400,
      },
    );
  }

  const { data: existingAgents, error: existingError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", name)
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

  const { data, error } = await supabase
    .from("agents")
    .update({
      name,
      monitored_handles: handles,
      monitoring_description: monitoringDescription,
      drafting_instructions: draftingInstructions,
    })
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
