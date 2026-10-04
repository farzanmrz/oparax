import { readParams, type SearchParams } from "@/next/frame";
import { NewsroomFeed } from "@/v2/newsroom/feed";
import { themeParam } from "@/v2/newsroom/data";

export const metadata = { title: "Oparax | Newsroom: Feed" };

// ?view=clustered|direct, ?theme=light|dark, ?settled=1 skips the arrival replay (for screenshots).
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return (
    <NewsroomFeed
      view={param("view") === "direct" ? "direct" : "clustered"}
      theme={themeParam(param("theme"))}
      settled={param("settled") === "1"}
    />
  );
}
