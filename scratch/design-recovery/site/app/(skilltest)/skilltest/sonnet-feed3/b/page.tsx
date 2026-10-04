import { Plates } from "@/skilltest/sonnet-feed3/plates";
import { parseParams } from "@/skilltest/sonnet-feed3/params";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <Plates {...parseParams(await searchParams)} />;
}
