import { redirect } from "next/navigation";
import { readParams, type SearchParams } from "@/next/frame";

// An alias of the feed's setup state (owner, Oct 5): /v2/one/feed?agent=none, with the same ?at, ?handle, ?error,
// ?why, ?state and ?layout params, so an old link and the lab switcher's Onboarding entry still open it.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const q = new URLSearchParams({ agent: "none" });
  for (const key of ["at", "handle", "error", "why", "state", "layout"]) {
    const v = param(key);
    if (v) q.set(key, v);
  }
  redirect(`/v2/one/feed?${q.toString()}`);
}
