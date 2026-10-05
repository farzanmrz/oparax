import { readParams, type SearchParams } from "@/next/frame";
import { OneFeed } from "@/v2/one/feed";

export const metadata = { title: "Oparax | One: Feed" };

// ?view=clustered|direct, ?label=handle, ?panel=open (source panel open; closed by default), ?source=<source id>
// (feed filtered to it), ?settled=1 (skip the arrival replay).
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return (
    <OneFeed
      initialView={param("view") === "direct" ? "direct" : "clustered"}
      initialMode={param("label") === "handle" ? "handle" : "name"}
      initialPanel={param("panel") === "open"}
      initialSource={param("source") ?? null}
      settled={param("settled") === "1"}
    />
  );
}
