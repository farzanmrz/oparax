import { Building } from "@/v2/window/building";
import { modeFromParams } from "@/next/building/mode";

export const metadata = { title: "Oparax | Window: Building" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// ?at=1..7 freezes that step mid-run, ?at=done shows the end state, ?state=failed the recorded failure.
export default async function BuildingPage({ searchParams }: { searchParams: SearchParams }) {
  const q = await searchParams;
  const at = typeof q.at === "string" ? q.at : undefined;
  const mode = modeFromParams(at, typeof q.state === "string" ? q.state : undefined);
  return <Building key={JSON.stringify(mode)} mode={mode} />;
}
