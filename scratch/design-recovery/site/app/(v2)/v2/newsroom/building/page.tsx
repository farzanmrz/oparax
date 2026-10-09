import { readParams, type SearchParams } from "@/next/frame";
import { Building } from "@/v2/newsroom/building";
import { themeParam } from "@/v2/newsroom/data";

export const metadata = { title: "Oparax | Newsroom: Building" };

// ?at=1..7 freezes that step mid-run, ?at=done shows the end, ?state=failed the recorded failure.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <Building theme={themeParam(param("theme"))} at={param("at")} failed={param("state") === "failed"} />;
}
