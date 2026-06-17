import { z } from "zod";

export const storySourceSchema = z.object({
  type: z.enum(["tweet", "article"]),
  url: z.url(),
  authorName: z.string().optional(), // tweet display name OR article site name
  handle: z.string().optional(), // tweet @handle (no @)
  title: z.string().optional(), // article headline
  text: z.string().optional(), // tweet text
  postedAt: z.string().optional(), // ISO 8601 if known
});

export const scanItemSchema = z.object({
  title: z.string(),
  body: z.string(),
  urls: z.array(z.url()).min(1).describe("Source URLs incl. at least one direct X/Twitter URL."),
  draft: z.string().max(280).describe("A single postable X draft; no raw URLs or markdown."),
  sources: z
    .array(storySourceSchema)
    .default([])
    .describe(
      "Structured per-source metadata. One entry per source URL. For tweets: include authorName, handle (no @), text, postedAt. For articles: include title, authorName (site name), postedAt. Do not invent avatars or fabricate metadata.",
    ),
});

export const scanResultSchema = z.object({
  items: z.array(scanItemSchema),
});

export type ScanItem = z.infer<typeof scanItemSchema>;
export type StorySourceItem = z.infer<typeof storySourceSchema>;
