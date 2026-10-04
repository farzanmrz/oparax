import { readParams, type SearchParams } from "@/next/frame";
import { DeckFeed } from "@/next/council/deck";

export const metadata = { title: "Oparax | Feed direction: Deck" };

export default async function DeckPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <DeckFeed view={param("view") === "direct" ? "direct" : "clustered"} theme={param("theme")} />;
}
