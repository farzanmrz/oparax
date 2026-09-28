import "server-only";

import { z } from "zod";

const launchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string(),
  description: z.string().nullable(),
  url: z.url({ protocol: /^https$/, hostname: /^(www\.)?producthunt\.com$/ }),
  votesCount: z.number().int().nonnegative(),
  topics: z.object({ edges: z.array(z.object({ node: z.object({ name: z.string() }) })) }),
});
const responseSchema = z.object({
  errors: z.array(z.object({ message: z.string() })).optional(),
  data: z
    .object({ posts: z.object({ edges: z.array(z.object({ node: launchSchema })).max(30) }) })
    .nullish(),
});
export type LaunchCandidate = {
  launch: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    url: string;
    votes: number;
    topics: string[];
  };
  whyNow: string;
};

export async function productHuntCandidates(now = new Date()): Promise<LaunchCandidate[]> {
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) throw new Error("Missing Product Hunt token");
  const response = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query DigestLaunches($after: DateTime!) {
        posts(postedAfter: $after, order: VOTES, first: 30) {
          edges { node { id name tagline description url votesCount topics(first: 20) { edges { node { name } } } } }
        }
      }`,
      variables: { after: new Date(now.getTime() - 86_400_000).toISOString() },
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Product Hunt ${response.status}`);
  const result = responseSchema.parse(await response.json());
  if (result.errors?.length || !result.data)
    throw new Error("Product Hunt returned GraphQL errors");
  return result.data.posts.edges.map(({ node }, index) => ({
    launch: {
      id: node.id,
      name: node.name,
      tagline: node.tagline,
      description: node.description ?? "",
      url: node.url,
      votes: node.votesCount,
      topics: node.topics.edges.map(({ node: topic }) => topic.name),
    },
    whyNow: `#${index + 1} on Product Hunt today, ${node.votesCount} votes`,
  }));
}
