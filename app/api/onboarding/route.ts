import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { runOnboarding } from "@/lib/onboarding/engine";
import type { OnboardingUIMessage } from "@/lib/onboarding/types";
import { createClient } from "@/lib/supabase/server";
import { normalizeValidHandle } from "@/lib/x/handle";

// A build reads posts, searches, ranks and checks sources; the lab's builds ran up to about four minutes.
export const maxDuration = 800;

const Body = z.object({ handle: z.string(), beat: z.string().trim().min(1).max(300) });

export async function POST(req: Request) {
  // Every build spends money on X and the models, so only a signed-in user may start one, except on localhost.
  if (process.env.NODE_ENV !== "development") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Sign in first.", { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const handle = parsed.success ? normalizeValidHandle(parsed.data.handle) : null;
  if (!parsed.success || !handle)
    return new Response("A valid X handle and a one-sentence beat are required.", { status: 400 });

  const stream = createUIMessageStream<OnboardingUIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      await runOnboarding({ handle, beat: parsed.data.beat }, writer);
      writer.write({ type: "finish" });
    },
    onError: (e) => (e instanceof Error ? e.message : String(e)),
  });
  return createUIMessageStreamResponse({ stream });
}
