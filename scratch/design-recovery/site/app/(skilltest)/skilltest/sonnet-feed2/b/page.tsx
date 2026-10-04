import { Folio } from "@/skilltest/sonnet-feed2/folio";

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; theme?: string; page?: string; pile?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "direct" ? "direct" : "clustered";
  return <Folio view={view} theme={sp.theme} page={Number(sp.page) || 1} />;
}
