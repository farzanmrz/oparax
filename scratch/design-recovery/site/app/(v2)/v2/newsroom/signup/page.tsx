import { readParams, type SearchParams } from "@/next/frame";
import { Signup } from "@/v2/newsroom/signup";
import { themeParam } from "@/v2/newsroom/data";

export const metadata = { title: "Oparax | Newsroom: Sign up" };

// ?state=sent shows the confirmation step.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <Signup theme={themeParam(param("theme"))} sent={param("state") === "sent"} />;
}
