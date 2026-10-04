import { readParams, type SearchParams } from "@/next/frame";
import { OneFeed } from "@/v2/one/feed";

export const metadata = { title: "Oparax | One: Feed" };

// ?view=clustered|direct, ?label=handle, ?panel=open (sidebar open), ?source=<source id> (feed filtered to it),
// ?reader=<story id>:<source id> (source reader open), ?banner=off (X DMs banner dismissed), ?settled=1
// (skip the arrival replay).
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const [storyId, sourceId] = (param("reader") ?? "").split(":");
  return (
    <OneFeed
      initialView={param("view") === "direct" ? "direct" : "clustered"}
      initialMode={param("label") === "handle" ? "handle" : "name"}
      initialPanel={param("panel") === "open"}
      initialSource={param("source") ?? null}
      initialReader={storyId && sourceId ? { storyId, sourceId } : null}
      bannerOff={param("banner") === "off"}
      settled={param("settled") === "1"}
    />
  );
}
