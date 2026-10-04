import { readParams, type SearchParams } from "@/next/frame";
import { modeFromParams } from "@/next/building/mode";
import { OneOnboarding } from "@/v2/one/onboarding";

export const metadata = { title: "Oparax | One: Onboarding" };

// Replays the sample run once and ends ready on the same page. ?at=1..8 freezes the run mid-way, ?at=done is the
// finished state, ?why=<source id> opens that source's reason.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const mode = modeFromParams(param("at"));
  return <OneOnboarding key={JSON.stringify(mode)} mode={mode} why={param("why") ?? null} />;
}
