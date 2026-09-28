import "server-only";

import { z } from "zod";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { normalizeValidHandle } from "@/lib/x/handle";

const id = z.string().regex(/^\d+$/);
const entities = z.object({
  urls: z
    .array(
      z.object({
        url: z.string(),
        expanded_url: z.string().optional(),
        title: z.string().optional(),
      }),
    )
    .optional(),
});
const tweet = z.object({
  id,
  text: z.string(),
  created_at: z.iso.datetime({ offset: true }).optional(),
  author_id: id.optional(),
  lang: z.string().optional(),
  entities: entities.optional(),
  note_tweet: z.object({ text: z.string(), entities: entities.optional() }).optional(),
  attachments: z.object({ media_keys: z.array(z.string()).optional() }).optional(),
  referenced_tweets: z
    .array(z.object({ id, type: z.enum(["quoted", "replied_to", "retweeted"]) }))
    .optional(),
});

export const timelineSchema = z.object({
  data: z
    .array(tweet.extend({ created_at: z.iso.datetime({ offset: true }), author_id: id }))
    .default([]),
  includes: z
    .object({
      users: z
        .array(z.object({ id, name: z.string(), username: z.string().optional() }))
        .default([]),
      tweets: z.array(tweet).default([]),
      media: z
        .array(
          z.object({
            media_key: z.string(),
            type: z.string(),
            url: z.url().optional(),
          }),
        )
        .default([]),
    })
    .prefault({}),
  meta: z.object({ next_token: z.string().optional() }),
});

function postText(post: z.infer<typeof tweet>): string {
  const links = (post.note_tweet?.entities ?? post.entities)?.urls ?? [];
  return [
    post.note_tweet?.text ?? post.text,
    ...links
      .filter((link) => link.title)
      .map((link) => `${link.title}: ${link.expanded_url ?? link.url}`),
  ].join("\n");
}

export function timelineItems(
  page: z.infer<typeof timelineSchema>,
  account: { handle: string; name: string; x_user_id: string },
): TablesInsert<"items">[] {
  const handle = normalizeValidHandle(account.handle);
  if (!handle) throw new Error("Invalid watched handle");
  const quotes = new Map(page.includes.tweets.map((post) => [post.id, post]));
  const media = new Map(page.includes.media.map((entry) => [entry.media_key, entry]));
  const users = new Map(page.includes.users.map((user) => [user.id, user]));
  return page.data
    .filter(
      (post) =>
        post.author_id === account.x_user_id &&
        !post.referenced_tweets?.some(
          (ref) => ref.type === "retweeted" || ref.type === "replied_to",
        ),
    )
    .map((post) => {
      const quoted = post.referenced_tweets?.find((ref) => ref.type === "quoted");
      const quote = quoted ? quotes.get(quoted.id) : undefined;
      const text = `${postText(post)}${quoted ? `\n[quote]\n${quote ? postText(quote) : "(X did not return the quoted post)"}\n[end quote]` : ""}`;
      const photo = post.attachments?.media_keys
        ?.map((key) => media.get(key))
        .find((entry) => entry?.type === "photo" && entry.url);
      return {
        id: `x:${post.id}`,
        source_id: `x-${handle}`,
        source_ids: [`x-${handle}`],
        kind: "post",
        url: `https://x.com/${handle}/status/${post.id}`,
        title: (post.note_tweet?.text ?? post.text).slice(0, 120),
        text,
        published_at: post.created_at,
        outcome: "full",
        image: photo?.url ?? null,
        lang: post.lang ?? null,
        author: {
          handle,
          name: users.get(post.author_id)?.name ?? account.name,
          x_user_id: post.author_id,
        },
      };
    });
}
