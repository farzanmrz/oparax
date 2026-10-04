import { readParams, type SearchParams } from "@/next/frame";
import { WindowFeed } from "@/next/council/window";

export const metadata = { title: "Oparax | Feed direction: Window" };

export default async function WindowPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <WindowFeed view={param("view") === "direct" ? "direct" : "clustered"} theme={param("theme")} story={param("story") ?? null} />;
}
