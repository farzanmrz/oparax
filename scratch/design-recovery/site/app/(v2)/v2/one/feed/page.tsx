import { readParams, type SearchParams } from "@/next/frame";
import type { RunMode } from "@/next/building/mode";
import { OneFeed } from "@/v2/one/feed";
import { OneOnboarding } from "@/v2/one/onboarding";

export const metadata = { title: "Oparax | One: Feed" };

const STEPS = 7;

/** The run has seven steps (next/building/steps.ts, which is client code). ?at=1..7 freezes the run mid-way, ?at=done is the finished state, ?state=failed the recorded failure. */
function modeFromParams(at: string | undefined, state: string | undefined): RunMode {
  const n = Number(at);
  if (state === "failed") return { kind: "failed" };
  if (at === "done") return { kind: "frozen", at: "done" };
  if (Number.isInteger(n) && n >= 1 && n <= STEPS) return { kind: "frozen", at: n };
  return { kind: "replay" };
}

// The feed holds the onboarding (owner, Oct 5: "The feed itself will have the onboarding if the feed has not been
// constructed"). ?agent=none is that state: the setup, then the run, on this page. Its own params: ?handle=typed
// leaves the X handle to type, ?error=blank opens with the sentence empty and its error, ?at=1..7 or done freezes
// the run, ?state=failed is the recorded failure, ?why=<source id> opens that source's reason. Otherwise the feed: ?view=clustered|direct, ?panel=open (the source list open; closed by
// default), ?source=<source id> (feed filtered to it), ?settled=1 (skip the arrival replay).
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  if (param("agent") === "none") {
    const mode = modeFromParams(param("at"), param("state"));
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
  return (
    <OneFeed
      initialView={param("view") === "direct" ? "direct" : "clustered"}
      initialPanel={param("panel") === "open"}
      initialSource={param("source") ?? null}
      settled={param("settled") === "1"}
    />
  );
}
