import { readParams, type SearchParams } from "@/next/frame";
import { FeedPage } from "@/next/feed/arrangements";
import { parseFeed } from "@/next/feed/model";

export default async function ExhaustedPage({ searchParams }: { searchParams: SearchParams }) {
  return <FeedPage options={parseFeed(await readParams(searchParams), { plan: "exhausted" })} />;
}
