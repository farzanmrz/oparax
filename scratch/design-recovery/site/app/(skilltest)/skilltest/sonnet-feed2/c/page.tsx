import { Piles } from "@/skilltest/sonnet-feed2/piles";

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; theme?: string; page?: string; pile?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "direct" ? "direct" : "clustered";
  return <Piles view={view} theme={sp.theme} pile={sp.pile} />;
}
