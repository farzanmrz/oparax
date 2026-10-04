import { Margin } from "@/skilltest/sonnet-feed3/margin";
import { parseParams } from "@/skilltest/sonnet-feed3/params";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <Margin {...parseParams(await searchParams)} />;
}
