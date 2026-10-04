import { readParams, type SearchParams } from "@/next/frame";
import { FeedShell } from "@/next/feed/arrangements";
import { parseFeed } from "@/next/feed/model";

export default async function FeedShellPage({ searchParams }: { searchParams: SearchParams }) {
  return <FeedShell options={parseFeed(await readParams(searchParams))} />;
}
