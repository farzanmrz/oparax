import { redirect } from "next/navigation";

// Setup is the onboarding page's first state; the query (?handle=typed, ?error=blank) carries over.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") q.set(k, v);
  }
  const query = q.toString();
  redirect(`/v2/one/onboarding${query ? `?${query}` : ""}`);
}
