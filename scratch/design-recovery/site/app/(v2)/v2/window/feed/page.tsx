import { WindowFeed } from "@/v2/window/feed";

export const metadata = { title: "Oparax | Window: Feed" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const q = await searchParams;
  const one = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  return <WindowFeed view={one("view") === "direct" ? "direct" : "clustered"} theme={one("theme")} source={one("source") ?? null} />;
}
