import { Page, readParams, type SearchParams } from "@/next/frame";
import { BuildRun, type RunMode } from "@/next/building/run";

export default async function BuildingPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const at = param("at");
  const n = Number(at);
  const mode: RunMode =
    param("state") === "failed"
      ? { kind: "failed" }
      : at === "done"
        ? { kind: "frozen", at: "done" }
        : n >= 1 && n <= 5
          ? { kind: "frozen", at: n }
          : { kind: "replay" };
  return (
    <Page header="member">
      <BuildRun key={JSON.stringify(mode)} mode={mode} />
    </Page>
  );
}
