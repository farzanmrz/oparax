// app/feed/[handle]/page.tsx
//
// The PUBLIC feed page, no auth, no session, always fresh. The server component fetches the
// whole first page through lib/feed/public-query and hands it to the client shell; an unknown
// handle renders an inline empty state (our copy, never a framework 404).

import Link from "next/link";
import { fetchPublicFeed } from "@/lib/feed/public-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthorizeModule } from "./authorize-module";
import { FeedClient } from "./feed-client";

export const dynamic = "force-dynamic";

export default async function PublicFeedPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await fetchPublicFeed(createAdminClient(), handle);

  if (!data) {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col items-start gap-3 rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] px-6 py-8 shadow-[var(--card-shadow)]">
        <h1 className="text-[21px] font-bold tracking-[-0.015em] text-text-page-header">
          No feed exists for this handle
        </h1>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-[14.5px] text-[var(--accent)] underline-offset-4 hover:underline desk:min-h-0"
        >
          Build one from the landing page
        </Link>
      </div>
    );
  }

  const deskName = data.agent.name ?? `@${data.agent.publicHandle}`;

  return (
    <div className="flex flex-col gap-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)]">
      <div className="flex flex-col gap-1">
        <h1 className="text-[21px] font-bold tracking-[-0.015em] text-text-page-header">
          {deskName}
        </h1>
        <p className="text-[14.5px] leading-[1.6] text-text-body">{data.agent.beat}</p>
      </div>
      <AuthorizeModule
        handle={data.agent.publicHandle}
        initialState={data.connectionState}
        trialEnded={data.trialEnded}
      />
      <FeedClient initial={data} />
    </div>
  );
}
