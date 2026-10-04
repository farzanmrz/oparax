import { readParams, type SearchParams } from "@/next/frame";
import { Setup } from "@/v2/newsroom/setup";
import { themeParam } from "@/v2/newsroom/data";

export const metadata = { title: "Oparax | Newsroom: Set up" };

// ?handle=typed (Google or email sign-in), ?filled=1 (the recorded sentence typed), ?error=blank.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return (
    <Setup
      theme={themeParam(param("theme"))}
      typed={param("handle") === "typed"}
      filled={param("filled") === "1"}
      blank={param("error") === "blank"}
    />
  );
}
