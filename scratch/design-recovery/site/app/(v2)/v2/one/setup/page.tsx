import { readParams, type SearchParams } from "@/next/frame";
import { OneSetup } from "@/v2/one/setup";

export const metadata = { title: "Oparax | One: Set Up" };

// ?handle=typed (signed up with Google or email: type the X handle), ?error=blank (empty sentence on submit).
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <OneSetup typed={param("handle") === "typed"} blank={param("error") === "blank"} />;
}
