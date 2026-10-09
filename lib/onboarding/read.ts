import "server-only";

import seedTable from "@/docs/source-table-seed.json";
import { createClient } from "@/lib/supabase/server";
import { normalizeValidHandle } from "@/lib/x/handle";
import { type BuildState, BuildStateSchema, type Post } from "./types";

// The owner's view of an onboarding run: the saved build_state, read through the owner's own session (RLS), checked
// with BuildStateSchema, and reduced to what the run page shows. Jev's scores become bands here and never leave the
// server; checkpoints and raw X payloads stay on the server too.

// The engine's bands (lib/onboarding/engine.ts: POSSIBLE, and the owner's strong line of September 21). The engine
// keeps POSSIBLE inside runOnboarding, so the value is repeated here; change both together.
const STRONG = 0.75;
const POSSIBLE = 0.35;
// The engine's limit on sites and feeds kept (engine.ts SITES).
const SITES = 10;

export type Band = "strong" | "possible" | "aside";
export type SourceKind = "x" | "rss" | "website" | "github";

export type OnboardingPost = {
  id: string;
  date: string;
  kind: "original" | "quote" | "thread";
  text: string;
  parts: number;
  quoted: { author: string; text: string } | null;
};
/** A candidate Jev scored, by band only. */
export type OnboardingCandidate = {
  key: string;
  kind: SourceKind;
  name: string;
  /** The @handle for an account, the host for a site or feed. */
  mark: string;
  band: Band;
};
/** A source the save keeps from the current answer. */
export type OnboardingSource = {
  key: string;
  kind: "x" | "rss" | "website";
  name: string;
  /** The @handle for an account, the host for a site or feed. */
  address: string;
  why: string;
};
export type Onboarding = {
  profile: { name: string; handle: string; bio: string; image: string | null } | null;
  /** The profile checkpoint is whole (the pinned post looked up too). */
  profileComplete: boolean;
  /** Null until the newest posts are saved. */
  posts: OnboardingPost[] | null;
  /** How many posts the engine read, a thread counting as one (its own count). */
  postsRead: number | null;
  /** Null until Jev's scores are saved; strongest first within each band. */
  candidates: OnboardingCandidate[] | null;
  /** Null until the model's answer is saved; only what the save would keep. */
  chosen: OnboardingSource[] | null;
  brief: { summary: string; interests: string[]; languages: string[] } | null;
  /** Answers saved so far: 2 once the one X search has been answered. */
  turns: number;
  /** The X search ran and did not answer. */
  searchFailed: boolean;
  /** The model's saved answer asked for the one X search (its search terms are not null). */
  searchAsked: boolean;
};

/** A run with nothing saved yet, for a state that does not parse or a session that does not own it. */
export const emptyOnboarding: Onboarding = {
  profile: null,
  profileComplete: false,
  posts: null,
  postsRead: null,
  candidates: null,
  chosen: null,
  brief: null,
  turns: 0,
  searchFailed: false,
  searchAsked: false,
};

type Row = (typeof seedTable)[number];
const table = new Map<string, Row>(seedTable.map((row) => [row.id, row]));
/** The account's handle as X writes it, for its avatar. */
const xHandleOf = (row: Row) => `@${row.target.replace(/\/+$/, "").split("/").pop()}`;
const handleOf = (row: Row) => xHandleOf(row).toLowerCase();
const tableAccounts = new Map(
  seedTable.filter((row) => row.kind === "x_account").map((row) => [handleOf(row), row]),
);
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const kindOf = (row: Row): SourceKind =>
  row.kind === "x_account"
    ? "x"
    : row.kind === "rss"
      ? "rss"
      : row.kind === "github"
        ? "github"
        : "website";
const bandOf = (score: number): Band =>
  score >= STRONG ? "strong" : score >= POSSIBLE ? "possible" : "aside";

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
  const profile = state.profile;
  const me = profile ? `@${profile.handle.replace(/^@/, "")}`.toLowerCase() : null;
  // Every quoted account in the saved posts and the pinned post, by handle, for its X name.
  const quotedNames = new Map(
    [...(state.posts ?? []), ...(profile?.pinned ? [profile.pinned] : [])]
      .flatMap((post) => (post.parts ? post.parts.map((part) => part.quoted) : [post.quoted]))
      .flatMap((quoted) => (quoted ? [[quoted.author.toLowerCase(), quoted.name] as const] : [])),
  );
  const scores = state.scores;
  const candidates = scores
    ? Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .flatMap(([key, score]): OnboardingCandidate[] => {
          const row = table.get(key);
          const band = bandOf(score);
          if (row) {
            const x = row.kind === "x_account";
            return [
              {
                key,
                kind: kindOf(row),
                name: row.name,
                mark: x ? xHandleOf(row) : hostOf(row.target),
                band,
              },
            ];
          }
          if (!key.startsWith("q-")) return [];
          const handle = `@${key.slice(2)}`;
          return [{ key, kind: "x", name: quotedNames.get(handle) ?? handle, mark: handle, band }];
        })
    : null;

  // What the save keeps (engine.ts final): a site or feed row Jev passed, each once, at most SITES; an account Jev
  // passed as a candidate or a search author, each once, never the person.
  const answer = state.answer;
  let chosen: OnboardingSource[] | null = null;
  if (answer && scores) {
    const sites = [...new Map(answer.sites.map((site) => [site.id, site])).values()]
      .flatMap((site): OnboardingSource[] => {
        const row = table.get(site.id);
        if (!row || row.kind === "x_account" || (scores[row.id] ?? 0) < POSSIBLE) return [];
        return [
          {
            key: row.id,
            kind: row.kind === "rss" ? "rss" : "website",
            name: row.name,
            address: hostOf(row.target),
            why: site.why,
          },
        ];
      })
      .slice(0, SITES);
    const handleScores = new Map<string, number>();
    for (const [key, score] of Object.entries(scores)) {
      const row = table.get(key);
      if (row?.kind === "x_account") handleScores.set(handleOf(row), score);
      else if (key.startsWith("q-")) handleScores.set(`@${key.slice(2)}`, score);
    }
    const authors = new Map(
      (state.searchResult?.authors ?? []).map((author) => [
        author.handle.toLowerCase(),
        author.name,
      ]),
    );
    for (const handle of authors.keys()) {
      const score = state.searchScores?.[`s-${handle.slice(1)}`];
      if (score !== undefined) handleScores.set(handle, score);
    }
    const accounts = [
      ...new Map(
        answer.accounts.flatMap((account) => {
          const valid = normalizeValidHandle(account.handle.replace(/^@/, ""));
          const handle = valid ? `@${valid.toLowerCase()}` : null;
          if (!handle || handle === me || (handleScores.get(handle) ?? 0) < POSSIBLE) return [];
          return [[handle, account.why] as const];
        }),
      ),
    ].map(([handle, why]): OnboardingSource => {
      const row = tableAccounts.get(handle);
      return {
        key: handle,
        kind: "x",
        name: row?.name ?? quotedNames.get(handle) ?? authors.get(handle) ?? handle,
        address: row ? xHandleOf(row) : handle,
        why,
      };
    });
    chosen = [...accounts, ...sites];
  }

  return {
    profile: profile
      ? {
          name: profile.name,
          handle: profile.handle,
          bio: profile.bio,
          image: profile.image ?? null,
        }
      : null,
    profileComplete: state.profileComplete === true,
    posts: state.posts ? state.posts.flatMap((post) => toPost(post) ?? []) : null,
    postsRead: state.posts?.length ?? null,
    candidates,
    chosen,
    brief: answer
      ? {
          summary: answer.brief.summary,
          interests: answer.brief.interests,
          languages: answer.brief.languages,
        }
      : null,
    turns: state.turns ?? 0,
    searchFailed: Boolean(state.searchResult?.failed),
    searchAsked: Boolean(answer?.search?.trim()),
  };
}
