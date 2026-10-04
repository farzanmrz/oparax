import { OneLogin } from "@/v2/one/login";

export const metadata = { title: "Oparax | One: Log in" };

// Log in and sign up on one form; ?mode=signup opens it in the sign-up state.
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <OneLogin initial={mode === "signup" ? "signup" : "login"} />;
}
