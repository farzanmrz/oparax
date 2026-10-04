import { readParams, type SearchParams } from "@/next/frame";
import { modeFromParams } from "@/next/building/mode";
import { DeckBuilding } from "@/v2/deck/building";

export const metadata = { title: "Oparax | Deck: Building" };

// Replays the recorded run once; ?at=1..8 freezes that step mid-run, ?at=done shows the end state, ?state=failed the failure.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const mode = modeFromParams(param("at"), param("state"));
  return <DeckBuilding key={JSON.stringify(mode)} mode={mode} />;
}
