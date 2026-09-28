import "server-only";

import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { githubTopics } from "@/lib/digests/topics";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 86_400_000;
const SEARCH_INTERVAL = 2_100;
const MAX_CANDIDATES = 30;
const repoSchema = z.object({
  full_name: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  html_url: z.url({ protocol: /^https$/, hostname: /^github\.com$/ }),
  description: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  created_at: z.iso.datetime({ offset: true }),
  topics: z.array(z.string()).default([]),
});
const searchSchema = z.object({
  incomplete_results: z.literal(false),
  items: z.array(repoSchema).max(10),
});
export type GithubRepo = {
  name: string;
  url: string;
  description: string;
  stars: number;
  created_at: string;
  topics: string[];
};
export type RepoCandidate = { repo: GithubRepo; whyNow: string };

// The cron's database claim makes this queue the only digest reader across instances.
export function githubReader(deadline: number) {
  let queue: Promise<unknown> = Promise.resolve();
  let nextSearch = 0;
  let blockedUntil = 0;

  function get(path: string, search = false): Promise<unknown> {
    const task = queue.then(async () => {
      const token = process.env.GITHUB_TOKEN;
      if (!token) throw new Error("Missing GitHub token");
      for (let attempt = 0; attempt < 2; attempt++) {
        const wait = Math.max(0, blockedUntil - Date.now(), search ? nextSearch - Date.now() : 0);
        if (wait > 60_000 || Date.now() + wait + 15_000 >= deadline)
          throw new Error("GitHub request deferred by rate limit or run deadline");
        if (wait) await sleep(wait);
        if (search) nextSearch = Date.now() + SEARCH_INTERVAL;
        const response = await fetch(`https://api.github.com${path}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        });
        const raw: unknown = await response.json();
        if (response.ok) return raw;
        const failure = z.object({ message: z.string() }).safeParse(raw);
        const limited =
          response.status === 429 ||
          (response.status === 403 &&
            (response.headers.has("retry-after") ||
              response.headers.get("x-ratelimit-remaining") === "0" ||
              (failure.success && /rate limit|secondary|abuse/i.test(failure.data.message))));
        if (limited) {
          const retryAfter = response.headers.get("retry-after");
          const reset = response.headers.get("x-ratelimit-reset");
          const delay =
            retryAfter !== null
              ? Number(retryAfter) * 1_000
              : response.headers.get("x-ratelimit-remaining") === "0" && reset !== null
                ? Number(reset) * 1_000 - Date.now()
                : 60_000;
          blockedUntil = Date.now() + (Number.isFinite(delay) ? Math.max(0, delay) : 60_000);
          if (attempt === 0 && blockedUntil - Date.now() <= 60_000) continue;
        }
        throw new Error(`GitHub ${response.status}`);
      }
      throw new Error("GitHub retry exhausted");
    });
    queue = task.catch(() => undefined);
    return task;
  }

  return {
    search: async (query: string, sort: "stars" | "updated") => {
      const params = new URLSearchParams({ q: query, sort, per_page: "10" });
      return searchSchema.parse(await get(`/search/repositories?${params}`, true)).items;
    },
    repo: async (name: string): Promise<GithubRepo> => {
      const valid = z
        .string()
        .regex(/^[\w.-]+\/[\w.-]+$/)
        .parse(name);
      return normalizeRepo(repoSchema.parse(await get(`/repos/${valid}`)));
    },
  };
}
export type GithubReader = ReturnType<typeof githubReader>;

function normalizeRepo(repo: z.infer<typeof repoSchema>): GithubRepo {
  return {
    name: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? "",
    stars: repo.stargazers_count,
    created_at: repo.created_at,
    topics: repo.topics,
  };
}

export function digestDescription(description: string): string {
  const sentences = new Intl.Segmenter("en", { granularity: "sentence" }).segment(description);
  return Array.from(sentences)
    .slice(0, 2)
    .map((part) => part.segment)
    .join("")
    .trim();
}

export async function githubCandidates(
  brief: unknown,
  reader: GithubReader,
  now = new Date(),
): Promise<RepoCandidate[]> {
  const cutoff = new Date(now.getTime() - 30 * DAY).toISOString().slice(0, 10);
  const observed = new Map<string, GithubRepo>();
  for (const term of githubTopics(brief)) {
    const recent = await reader.search(`${term} created:>${cutoff} stars:>100`, "stars");
    const rising = await reader.search(`${term} stars:>1000`, "updated");
    for (let index = 0; index < Math.max(recent.length, rising.length); index++) {
      for (const row of [recent[index], rising[index]]) {
        if (row) observed.set(row.full_name.toLowerCase(), normalizeRepo(row));
      }
    }
  }
  const repos = [...observed.values()];
  if (!repos.length) return [];
  const db = createAdminClient();
  const { data: previous, error } = await db
    .from("repo_snapshots")
    .select("repo,stars")
    .eq("day", new Date(now.getTime() - 7 * DAY).toISOString().slice(0, 10))
    .in(
      "repo",
      repos.map((repo) => repo.name.toLowerCase()),
    );
  if (error) throw error;
  const { error: snapshotError } = await db.from("repo_snapshots").upsert(
    repos.map((repo) => ({
      repo: repo.name.toLowerCase(),
      day: now.toISOString().slice(0, 10),
      stars: repo.stars,
      observed_at: now.toISOString(),
    })),
    { onConflict: "repo,day" },
  );
  if (snapshotError) throw snapshotError;
  const baseline = new Map(previous.map((row) => [row.repo, row.stars]));
  const candidates: RepoCandidate[] = [];
  for (const repo of repos) {
    const age = Math.max(0, Math.floor((now.getTime() - Date.parse(repo.created_at)) / DAY));
    const oldStars = baseline.get(repo.name.toLowerCase());
    const gained = oldStars === undefined ? null : repo.stars - oldStars;
    if (Date.parse(repo.created_at) > Date.parse(cutoff) && repo.stars > 100) {
      candidates.push({ repo, whyNow: `${repo.stars} stars, created ${age} days ago` });
    } else if (
      repo.stars > 1_000 &&
      oldStars !== undefined &&
      gained !== null &&
      gained >= 100 &&
      gained >= oldStars * 0.25
    ) {
      candidates.push({ repo, whyNow: `+${gained} stars this week (${repo.stars} total)` });
    }
    if (candidates.length === MAX_CANDIDATES) break;
  }
  return candidates;
}
