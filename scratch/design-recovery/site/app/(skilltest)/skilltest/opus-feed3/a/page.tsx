import { BandsFeed } from "@/skilltest/opus-feed3/bands";
import { readState } from "@/skilltest/opus-feed3/model";

export const metadata = { title: "Oparax | Feed direction: Directory and bands" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <BandsFeed state={readState(await searchParams)} />;
}
