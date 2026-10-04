import { readParams, type SearchParams } from "@/next/frame";
import { DayRiver } from "@/skilltest/sonnet-feed/day-river";

export const metadata = { title: "Oparax | Feed direction: Day river" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <DayRiver view={param("view") === "direct" ? "direct" : "clustered"} theme={param("theme")} />;
}
