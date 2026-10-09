import { readParams, type SearchParams } from "@/next/frame";
import { DeckFeed } from "@/v2/deck/feed";

export const metadata = { title: "Oparax | Deck: Feed" };

// ?source=<source id>, ?settled=1 (skip the arrival replay for screenshots).
export default async function DeckFeedPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return (
    <DeckFeed
      initialView="clustered"
      initialSource={param("source") ?? null}
      initialMode="name"
      settled={param("settled") === "1"}
    />
  );
}
