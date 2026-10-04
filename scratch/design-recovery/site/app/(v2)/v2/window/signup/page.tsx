import { Signup } from "@/v2/window/signup";

export const metadata = { title: "Oparax | Window: Sign up" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const q = await searchParams;
  return <Signup sent={q.state === "sent"} />;
}
