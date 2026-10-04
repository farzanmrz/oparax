import { readParams, type SearchParams } from "@/next/frame";
import { Login } from "@/v2/newsroom/login";
import { themeParam } from "@/v2/newsroom/data";

export const metadata = { title: "Oparax | Newsroom: Log in" };

// Log in and sign up on one form; ?mode=signup opens it in the sign-up state.
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return <Login theme={themeParam(param("theme"))} initial={param("mode") === "signup" ? "signup" : "login"} />;
}
