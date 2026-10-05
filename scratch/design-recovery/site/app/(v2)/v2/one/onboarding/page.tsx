import { readParams, type SearchParams } from "@/next/frame";
import { modeFromParams } from "@/next/building/mode";
import { OneOnboarding } from "@/v2/one/onboarding";

export const metadata = { title: "Oparax | One: Onboarding" };

// Opens before the run (setup is this page's first state): ?handle=typed leaves the X handle to type, ?error=blank
// opens with the sentence empty and its error. Build my agent replays the sample run on the same page. ?at=1..8
// freezes the run mid-way, ?at=done is the finished state, ?state=failed the recorded failure, ?why=<source id>
// opens that source's reason.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const at = param("at");
  const state = param("state");
  const mode = modeFromParams(at, state);
  return (
    <OneOnboarding
      key={JSON.stringify(mode)}
      mode={mode}
      started={mode.kind !== "replay"}
      why={param("why") ?? null}
      typed={param("handle") === "typed"}
      blank={param("error") === "blank"}
    />
  );
}
