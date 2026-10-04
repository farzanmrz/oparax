import { SheetFeed } from "@/skilltest/opus-feed3/sheet";
import { readState } from "@/skilltest/opus-feed3/model";

export const metadata = { title: "Oparax | Feed direction: Rail and sheet" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <SheetFeed state={readState(await searchParams)} />;
}
