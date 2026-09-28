import { z } from "zod";

// score is Jev's probability, from 0 to 1, that the pick is a useful source for the beat.
type Site = {
  id: string;
  name: string;
  focus: string;
  kind: string;
  target: string;
  why: string;
  score: number;
};

type Account = { handle: string; why: string; score: number };

// The recommendation: up to ten sites and feeds from the table, the X accounts, and the one X search if it ran.
export type Final = { sites: Site[]; accounts: Account[]; searched: string | null };

// What the page shows under the handle box when X has no account for it.
export const HANDLE_NOT_FOUND = "Handle not found";

export const BRIEF_CHARS = 1200;
export const TOPIC_MIN = 3;
export const TOPIC_MAX = 8;
const plainText = z
  .string()
  .min(1)
  .regex(/^[^\u2014]*$/)
  .refine(
    (text) => !/(?:^|\n)\s*(?:#{1,6} |[-*] |\d+\. )|\*\*|```|\[[^\]]+\]\(/.test(text),
    "Use plain text",
  );
export const BriefSchema = z.object({
  summary: plainText.max(BRIEF_CHARS),
  interests: z.array(plainText),
  languages: z.array(plainText),
  topic_terms: z.array(plainText).min(TOPIC_MIN).max(TOPIC_MAX),
});
export const AnswerSchema = z.object({
  sites: z.array(z.object({ id: z.string(), why: plainText })),
  accounts: z.array(z.object({ handle: z.string(), why: plainText })),
  search: z.string().nullable(),
  brief: BriefSchema,
});
const mediaSchema = z.object({
  type: z.string(),
  alt: z.string().optional(),
  src: z.string().optional(),
});
const quotedSchema = z.object({
  id: z.string(),
  author: z.string(),
  name: z.string(),
  bio: z.string().optional(),
  text: z.string(),
  media: z.array(mediaSchema).optional(),
});
const linkMetaSchema = z.record(
  z.string(),
  z.object({ title: z.string().optional(), description: z.string().optional() }),
);
const partSchema = z.object({
  id: z.string(),
  date: z.string(),
  text: z.string(),
  quoted: quotedSchema.nullish(),
  links: z.array(z.string()).optional(),
  link_meta: linkMetaSchema.optional(),
  media: z.array(mediaSchema).optional(),
});
export const PostSchema = z.object({
  id: z.string(),
  date: z.string(),
  kind: z.enum(["original", "quote", "thread", "thread_part"]),
  lang: z.string().optional(),
  text: z.string(),
  parts: z.array(partSchema).optional(),
  quoted: quotedSchema.nullable(),
  parent_id: z.string().optional(),
  links: z.array(z.string()),
  link_meta: linkMetaSchema,
  mentions: z.array(z.string()),
  hashtags: z.array(z.string()),
  cashtags: z.array(z.string()),
  media: z.array(mediaSchema),
  poll: z.array(z.string()).optional(),
  sponsored: z.boolean().optional(),
  conversation_id: z.string().optional(),
  edit_ids: z.array(z.string()).optional(),
});
export const ProfileSchema = z.object({
  id: z.string(),
  handle: z.string(),
  name: z.string(),
  bio: z.string(),
  image: z.string().optional(),
  site: z.string().optional(),
  pinned: PostSchema.nullable(),
});
export const SearchSchema = z.object({
  query: z.string(),
  authors: z.array(
    z.object({ handle: z.string(), name: z.string(), bio: z.string(), post: z.string() }),
  ),
  failed: z.string().nullable(),
});
const scoresSchema = z.record(z.string(), z.number().min(0).max(1));
export const BuildStateSchema = z.object({
  profile: ProfileSchema.optional(),
  x_user_id: z.string().optional(),
  pinnedId: z.string().optional(),
  profileComplete: z.boolean().optional(),
  posts: z.array(PostSchema).optional(),
  timeline: z
    .object({
      posts: z.array(PostSchema),
      page: z.number().int(),
      token: z.string().optional(),
      untilId: z.string().optional(),
      done: z.boolean(),
    })
    .optional(),
  scores: scoresSchema.optional(),
  answer: AnswerSchema.optional(),
  searched: z.string().nullable().optional(),
  searchResult: SearchSchema.optional(),
  searchScores: scoresSchema.optional(),
  turns: z.number().int().nonnegative().optional(),
});
export type BuildState = z.infer<typeof BuildStateSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Media = z.infer<typeof mediaSchema>;
export type Quoted = z.infer<typeof quotedSchema>;
export type Part = z.infer<typeof partSchema>;
export type LinkMeta = z.infer<typeof linkMetaSchema>[string];

const xid = z.string().regex(/^\d+$/);
const urlEntity = z.object({
  url: z.string(),
  expanded_url: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});
const entities = z.object({
  urls: z.array(urlEntity).optional(),
  mentions: z.array(z.object({ username: z.string() })).optional(),
  hashtags: z.array(z.object({ tag: z.string() })).optional(),
  cashtags: z.array(z.object({ tag: z.string() })).optional(),
});
const xUser = z.object({
  id: xid,
  username: z.string(),
  name: z.string(),
  description: z.string().optional(),
  pinned_tweet_id: xid.optional(),
  profile_image_url: z.string().optional(),
  url: z.string().optional(),
  entities: z.object({ url: entities.optional(), description: entities.optional() }).optional(),
});
const xPost = z.object({
  id: xid,
  text: z.string(),
  created_at: z.string(),
  author_id: xid,
  lang: z.string().optional(),
  conversation_id: xid.optional(),
  in_reply_to_user_id: xid.optional(),
  edit_history_tweet_ids: z.array(xid).optional(),
  entities: entities.optional(),
  note_tweet: z.object({ text: z.string(), entities: entities.optional() }).optional(),
  referenced_tweets: z
    .array(z.object({ type: z.enum(["retweeted", "quoted", "replied_to"]), id: xid }))
    .optional(),
  attachments: z
    .object({ media_keys: z.array(z.string()).optional(), poll_ids: z.array(xid).optional() })
    .optional(),
});
export const XProfileSchema = z.object({ data: xUser });
export const XPostsSchema = z.object({
  data: z.array(xPost).default([]),
  meta: z.object({ next_token: z.string().optional(), oldest_id: xid.optional() }).optional(),
  includes: z
    .object({
      users: z.array(xUser).optional(),
      tweets: z.array(xPost).optional(),
      media: z
        .array(
          z.object({
            media_key: z.string(),
            type: z.string(),
            alt_text: z.string().optional(),
            url: z.string().optional(),
            preview_image_url: z.string().optional(),
          }),
        )
        .optional(),
      polls: z
        .array(z.object({ id: xid, options: z.array(z.object({ label: z.string() })) }))
        .optional(),
    })
    .optional(),
});
