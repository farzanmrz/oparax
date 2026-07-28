import twitterText from "twitter-text";
import { X_CHAR_LIMITS } from "@/lib/agent/desk-config";

/** X's own weighted-length counter over the corpus: any single post over the standard
 * ceiling can only have been published by a premium account. */
export function inferAccountTier(posts: { text: string }[]): "standard" | "premium" {
  return posts.some((p) => twitterText.parseTweet(p.text).weightedLength > X_CHAR_LIMITS.standard)
    ? "premium"
    : "standard";
}
