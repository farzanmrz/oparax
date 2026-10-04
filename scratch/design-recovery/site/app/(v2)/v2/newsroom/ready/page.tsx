import { readParams, type SearchParams } from "@/next/frame";
import { Ready } from "@/v2/newsroom/ready";
import { themeParam } from "@/v2/newsroom/data";

export const metadata = { title: "Oparax | Newsroom: Ready" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <Ready theme={themeParam(param("theme"))} />;
}
