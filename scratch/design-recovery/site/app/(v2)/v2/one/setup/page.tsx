import { readParams, type SearchParams } from "@/next/frame";
import { OneOnboarding } from "@/v2/one/onboarding";

export const metadata = { title: "Oparax | One: Set Up" };

// Setup is the onboarding page before the run. ?handle=typed (signed up with Google or email: type the X handle),
// ?error=blank (empty sentence on submit).
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <OneOnboarding phase="setup" typed={param("handle") === "typed"} blank={param("error") === "blank"} />;
}
