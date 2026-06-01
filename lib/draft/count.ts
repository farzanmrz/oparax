// Imports
import twitterText from "twitter-text"

// X's post limit in weighted characters (emoji/CJK = 2, URLs = 23).
export const TWEET_WEIGHTED_LIMIT = 280

/**
 * Weighted character length of a draft per X's rules, via twitter-text.
 * @param text - the draft text
 * @returns the weighted length (not a plain code-point count)
 */
export function weightedLength(text: string): number {
  return twitterText.parseTweet(text).weightedLength
}
