"use client"

import { Tweet } from "react-tweet"

// Matches Grok inline citations like [[1]](https://x.com/user/status/123)
const CITATION_RE = /(\[\[\d+\]\]\([^)]+\))/

// Extracts the URL from a citation markdown string
const URL_RE = /\]\]\((.*)\)$/

// Matches X post URLs and captures the tweet ID
const TWEET_ID_RE = /x\.com\/.+\/status\/(\d+)/

interface ScanResultProps {
  outputText: string
}

/** Parses a single citation markdown string and returns either a tweet embed or a link. */
function renderCitation(citation: string, index: number) {
  const urlMatch = citation.match(URL_RE)
  if (!urlMatch) return <span key={index}>{citation}</span>

  const url = urlMatch[1]
  const tweetMatch = url.match(TWEET_ID_RE)

  if (tweetMatch) {
    return (
      <div key={index} className="my-3">
        <Tweet id={tweetMatch[1]} />
      </div>
    )
  }

  // Non-X citation — render as a regular link
  const labelMatch = citation.match(/\[\[(\d+)\]\]/)
  const label = labelMatch ? `[${labelMatch[1]}]` : "[link]"

  return (
    <a
      key={index}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  )
}

/**
 * Walks through parsed segments, grouping consecutive tweet citations
 * into flex rows so they flow side-by-side instead of stacking vertically.
 */
export function ScanResult({ outputText }: ScanResultProps) {
  const segments = outputText.split(CITATION_RE)
  const elements: React.ReactNode[] = []
  let tweetGroup: React.ReactNode[] = []

  function flushTweetGroup() {
    if (tweetGroup.length === 0) return
    elements.push(
      <div key={`tg-${elements.length}`} className="flex flex-wrap gap-4">
        {tweetGroup}
      </div>
    )
    tweetGroup = []
  }

  segments.forEach((segment, i) => {
    if (CITATION_RE.test(segment)) {
      const urlMatch = segment.match(URL_RE)
      const url = urlMatch?.[1]
      const tweetMatch = url?.match(TWEET_ID_RE)

      if (tweetMatch) {
        // Accumulate tweet into current group
        tweetGroup.push(
          <div key={i} className="max-w-[350px]">
            <Tweet id={tweetMatch[1]} />
          </div>
        )
        return
      }

      // Non-tweet citation — flush any pending tweets, then render link
      flushTweetGroup()
      elements.push(renderCitation(segment, i))
      return
    }

    // Plain text — flush tweets, then render text
    if (!segment) return
    flushTweetGroup()
    elements.push(
      <span key={i} className="whitespace-pre-wrap">
        {segment}
      </span>
    )
  })

  // Flush any remaining tweets at the end
  flushTweetGroup()

  return (
    <div className="space-y-1 text-sm text-muted-foreground">{elements}</div>
  )
}
