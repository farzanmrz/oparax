import { readParams, type SearchParams } from "@/next/frame";
import { DeckFeed } from "@/v2/deck/feed";

export const metadata = { title: "Oparax | Deck: Feed" };

// ?view=clustered|direct, ?source=<source id>, ?label=handle, ?settled=1 (skip the arrival replay for screenshots).
export default async function DeckFeedPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return (
    <DeckFeed
      initialView={param("view") === "direct" ? "direct" : "clustered"}
      initialSource={param("source") ?? null}
      initialMode={param("label") === "handle" ? "handle" : "name"}
      settled={param("settled") === "1"}
    />
  );
}
