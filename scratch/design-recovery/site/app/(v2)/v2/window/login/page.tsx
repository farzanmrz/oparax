import { Login } from "@/v2/window/login";

export const metadata = { title: "Oparax | Window: Log in" };

// Log in and sign up on one form; ?mode=signup opens it in the sign-up state.
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <Login initial={mode === "signup" ? "signup" : "login"} />;
}
