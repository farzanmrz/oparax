import type { Metadata } from "next";
import { z } from "zod";
import type { LandingExample } from "@/components/landing/example-agent";
import { LandingPage } from "@/components/landing/landing-page";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { verifiedCardSchema } from "@/lib/feed/types";
import { landingContent } from "@/lib/landing/content";
import { readMonitor } from "@/lib/monitor/read";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

export const metadata: Metadata = {
  openGraph: {
    title: landingContent.sharing.title,
    description: landingContent.sharing.description,
    siteName: landingContent.brand,
    type: "website",
    url: "/",
  },
};

async function readExample(): Promise<LandingExample | null> {
  try {
    const monitor = await readMonitor(landingContent.example.handle);
    if (!monitor?.build_finished_at) return null;
    const { data, error } = await createAdminClient()
      .from("stories")
      .select("id,fallback_title,last_changed_at,image,status,card")
      .eq("monitor_id", monitor.id)
      .eq("status", "written")
      .order("last_published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(3);
    if (error) throw error;
    return {
      brief: monitor.brief?.summary ?? monitor.beat,
      stories: (data ?? []).flatMap((story) => {
        const card = verifiedCardSchema.safeParse(story.card);
        return card.success ? [{ ...story, card: card.data, reports: [] }] : [];
      }),
    };
  } catch (error) {
    // An unavailable example must not block a visitor from building their own agent.
    reportServerException(error, { tags: { area: "landing", stage: "example" } });
    return null;
  }
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, session, example] = await Promise.all([
    searchParams,
    createClient().then((client) => client.auth.getUser()),
    readExample(),
  ]);
  const { user } = session.data;
  const error = z.enum(["handle", "beat", "notfound", "lookup"]).safeParse(query.error).data;
  const rawHandle = z.string().max(100).safeParse(query.handle).data;
  const handle = rawHandle ? normalizeValidHandle(rawHandle) : null;
  const closed = z.literal("1").safeParse(query.closed).success;
  const noAgent = z.literal("1").safeParse(query.noagent).success;
  return (
    <>
      <PostHogUserContext id={user?.id ?? null} email={user?.email} />
      <LandingPage
        key={`${closed}:${error ?? ""}:${handle ?? ""}`}
        signedIn={Boolean(user)}
        closed={closed}
        error={error}
        handle={handle && !isReservedHandle(handle) ? handle : undefined}
        noAgent={noAgent}
        example={example}
      />
    </>
  );
}
