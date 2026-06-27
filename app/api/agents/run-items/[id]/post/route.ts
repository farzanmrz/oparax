// Imports
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postRunItem } from "@/lib/x/post-item";

export const runtime = "nodejs";

/**
 * Post one persisted draft to X, then update the run item with the live tweet.
 * @param req - optional finalText override from the editor
 * @param context.params - dynamic run item id
 * @returns the posted tweet url
 */
export async function POST(
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

  const rawBody = (await req.json().catch(() => null)) as unknown;
  const body = typeof rawBody === "object" && rawBody !== null ? rawBody : {};
  const requestedText =
    typeof (
      body as {
        finalText?: unknown;
      }
    ).finalText === "string"
      ? (
          body as {
            finalText: string;
          }
        ).finalText.trim()
      : "";

  const result = await postRunItem({
    supabase,
    ownerUserId: user.id,
    itemId: id,
    requestedText: requestedText || undefined,
    postedVia: "manual",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status },
    );
  }
  return NextResponse.json({ id: result.id, url: result.url });
}
