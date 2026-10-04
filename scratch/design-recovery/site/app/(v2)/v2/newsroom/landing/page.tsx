import { readParams, type SearchParams } from "@/next/frame";
import { Landing } from "@/v2/newsroom/landing";
import { themeParam } from "@/v2/newsroom/data";

export const metadata = { title: "Oparax | Newsroom: Landing" };

// ?settled=1 renders the hero replay in its end state (for screenshots).
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <Landing theme={themeParam(param("theme"))} settled={param("settled") === "1"} />;
}
