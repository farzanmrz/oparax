import { readParams, type SearchParams } from "@/next/frame";
import { Reader } from "@/skilltest/opus-feed/reader";

export const metadata = { title: "Oparax | Feed direction: Reader" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <Reader view={param("view") === "direct" ? "direct" : "clustered"} theme={param("theme")} />;
}
