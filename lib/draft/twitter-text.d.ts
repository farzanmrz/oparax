// Minimal ambient types for the `parseTweet` surface we use from twitter-text
// (3.1.0 ships no types). Avoids adding a separate @types dependency.
declare module "twitter-text" {
  // The subset of parseTweet's result the draft counter relies on.
  export interface ParsedTweet {
    weightedLength: number
    valid: boolean
    permillage: number
    displayRangeStart: number
    displayRangeEnd: number
    validRangeStart: number
    validRangeEnd: number
  }

  // Parse a tweet and return its weighted length + validity (X weighting).
  export function parseTweet(text: string): ParsedTweet

  const twitterText: { parseTweet: typeof parseTweet }
  export default twitterText
}
