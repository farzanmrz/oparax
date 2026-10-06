import "server-only";

import seedTable from "@/docs/source-table-seed.json";
import { createClient } from "@/lib/supabase/server";
import { type BuildState, BuildStateSchema, type Post } from "./types";

// The owner's view of an onboarding run: the saved build_state, read through the owner's own session (RLS), checked
// with BuildStateSchema, and reduced to what the onboarding page shows. Scores, checkpoints and raw X payloads stay
// on the server.

export type OnboardingPost = {
  id: string;
  date: string;
  kind: "original" | "quote" | "thread";
  text: string;
  parts: number;
  quoted: { author: string; text: string } | null;
};
export type OnboardingSource = {
  key: string;
  kind: "x" | "rss" | "website";
  name: string;
  /** The @handle for an account, the host for a site or feed. */
  address: string;
  why: string;
  /** The saved post of theirs that quotes this account, when there is one. */
  quote: OnboardingPost | null;
};
export type Onboarding = {
  profile: {
    name: string;
    handle: string;
    bio: string;
    image: string | null;
    pinned: { date: string; text: string } | null;
  } | null;
  posts: OnboardingPost[];
  sources: OnboardingSource[];
  brief: { summary: string; interests: string[]; languages: string[] } | null;
};

const table = new Map(seedTable.map((row) => [row.id, row]));
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function toPost(post: Post): OnboardingPost | null {
  if (post.kind === "thread_part") return null;
  const quoted = post.quoted ?? post.parts?.find((part) => part.quoted)?.quoted ?? null;
  return {
    id: post.id,
    date: post.date,
    kind: post.kind,
    text: post.text,
    parts: post.parts?.length ?? 0,
    quoted: quoted ? { author: quoted.author, text: quoted.text } : null,
  };
}

/** Null when there is no session, the monitor is not this person's, or the saved state does not parse. */
export async function readOnboarding(monitorId: string): Promise<Onboarding | null> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data, error } = await db
    .from("monitors")
    .select("build_state")
    .eq("id", monitorId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const parsed = BuildStateSchema.safeParse(data.build_state ?? {});
  return parsed.success ? toOnboarding(parsed.data) : null;
}

/** The page's view of a checked build_state (the development preview passes its fixture through here too). */
export function toOnboarding(state: BuildState): Onboarding {
  const posts = (state.posts ?? []).flatMap((post) => toPost(post) ?? []);
  const quoting = (handle: string) =>
    posts.find((post) => post.quoted?.author.toLowerCase() === handle.toLowerCase()) ?? null;
  const answer = state.answer;
  const sites = [...new Map((answer?.sites ?? []).map((site) => [site.id, site])).values()].flatMap(
    (site): OnboardingSource[] => {
      const row = table.get(site.id);
      if (!row || (row.kind !== "rss" && row.kind !== "website")) return [];
      return [
        {
          key: row.id,
          kind: row.kind,
          name: row.name,
          address: hostOf(row.target),
          why: site.why,
          quote: null,
        },
      ];
    },
  );
  const accounts = [
    ...new Map(
      (answer?.accounts ?? []).map((account) => {
        const handle = `@${account.handle.replace(/^@/, "").toLowerCase()}`;
        return [handle, account.why] as const;
      }),
    ),
  ].map(
    ([handle, why]): OnboardingSource => ({
      key: handle,
      kind: "x",
      name: handle,
      address: handle,
      why,
      quote: quoting(handle),
    }),
  );
  const profile = state.profile;
  return {
    profile: profile
      ? {
          name: profile.name,
          handle: profile.handle,
          bio: profile.bio,
          image: profile.image ?? null,
          pinned: profile.pinned ? { date: profile.pinned.date, text: profile.pinned.text } : null,
        }
      : null,
    posts,
    sources: [...accounts, ...sites],
    brief: answer
      ? {
          summary: answer.brief.summary,
          interests: answer.brief.interests,
          languages: answer.brief.languages,
        }
      : null,
  };
}
