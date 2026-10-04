import { readParams, type SearchParams } from "@/next/frame";
import { FeedPage } from "@/next/feed/arrangements";
import { parseFeed } from "@/next/feed/model";

// The ready summary is the first visit of the feed, not a separate screen (NOTES.md). Rendered in the
// simple page arrangement; the shell would hold the identical column.
export default async function ReadyPage({ searchParams }: { searchParams: SearchParams }) {
  const options = parseFeed(await readParams(searchParams), { first: true, state: "empty" });
  return <FeedPage options={options} base="/next/feed/page" />;
}
