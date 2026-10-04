import { readParams, type SearchParams } from "@/next/frame";
import { FeedPage } from "@/next/feed/arrangements";
import { FeedPageNew } from "@/next/feed/compose-new";
import { parseFeed } from "@/next/feed/model";

export default async function FeedSimplePage({ searchParams }: { searchParams: SearchParams }) {
  const options = parseFeed(await readParams(searchParams));
  return options.compose === "old" ? <FeedPage options={options} /> : <FeedPageNew options={options} />;
}
