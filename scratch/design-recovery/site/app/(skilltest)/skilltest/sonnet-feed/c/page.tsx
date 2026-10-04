import { readParams, type SearchParams } from "@/next/frame";
import { CaseFile } from "@/skilltest/sonnet-feed/case-file";

export const metadata = { title: "Oparax | Feed direction: Case file" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <CaseFile view={param("view") === "direct" ? "direct" : "clustered"} theme={param("theme")} />;
}
