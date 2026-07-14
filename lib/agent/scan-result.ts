// lib/agent/scan-result.ts
//
// The scan-result shape — CLIENT-SAFE, pure zod, NO server-only imports (no fs, no
// sysprompts, no tools). Shared by the headless scan runner (this dir, server), the
// [id] page's run parse (server), the dashboard UI (client), and the draft action
// (server) — every one of those imports this file, so it must stay importable from a
// client component.
import { z } from "zod";

export const newsItemSchema = z.object({
  headline: z.string().describe("The atomic development — one clear, specific story beat."),
  body: z
    .string()
    .describe("A grounded description of the development, synthesized from the source posts."),
  sources: z
    .array(
      z.object({
        handle: z.string().describe("The bare X handle (no @) that posted this source."),
        url: z.string().describe("The direct post URL."),
      }),
    )
    .describe("One entry per contributing post."),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

export const scanResultSchema = z.object({
  items: z.array(newsItemSchema).describe("The news items synthesized from this scan."),
});
export type ScanResult = z.infer<typeof scanResultSchema>;
