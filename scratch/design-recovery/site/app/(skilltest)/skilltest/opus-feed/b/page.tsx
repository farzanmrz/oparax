import { readParams, type SearchParams } from "@/next/frame";
import { Convergence } from "@/skilltest/opus-feed/wire";

export const metadata = { title: "Oparax | Feed direction: Convergence" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <Convergence view={param("view") === "direct" ? "direct" : "clustered"} theme={param("theme")} />;
}
