import { readParams, type SearchParams } from "@/next/frame";
import { FrontPage } from "@/skilltest/sonnet-feed/front-page";

export const metadata = { title: "Oparax | Feed direction: Front page" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <FrontPage view={param("view") === "direct" ? "direct" : "clustered"} theme={param("theme")} />;
}
