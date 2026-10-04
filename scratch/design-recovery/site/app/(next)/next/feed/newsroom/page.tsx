import { readParams, type SearchParams } from "@/next/frame";
import { NewsroomFeed } from "@/next/council/newsroom";

export const metadata = { title: "Oparax | Feed direction: Newsroom" };

// Densest direction, so it opens on Direct (every report as its own row); ?view=clustered switches.
export default async function NewsroomPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <NewsroomFeed view={param("view") === "clustered" ? "clustered" : "direct"} theme={param("theme")} story={param("story") ?? null} />;
}
