import { readParams, type SearchParams } from "@/next/frame";
import { DeckSetup } from "@/v2/deck/setup";

export const metadata = { title: "Oparax | Deck: Set Up" };

// ?handle=typed (signed up with Google or email: type the X handle), ?error=blank (empty sentence on submit).
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <DeckSetup typed={param("handle") === "typed"} blank={param("error") === "blank"} />;
}
