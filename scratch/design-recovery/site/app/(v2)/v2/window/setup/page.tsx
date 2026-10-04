import { Setup } from "@/v2/window/setup";

export const metadata = { title: "Oparax | Window: Set up" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SetupPage({ searchParams }: { searchParams: SearchParams }) {
  const q = await searchParams;
  return <Setup typed={q.handle === "typed"} blank={q.error === "blank"} />;
}
