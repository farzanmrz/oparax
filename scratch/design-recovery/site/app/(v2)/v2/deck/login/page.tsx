import { DeckLogin } from "@/v2/deck/login";

export const metadata = { title: "Oparax | Deck: Log in" };

// Log in and sign up on one form; ?mode=signup opens it in the sign-up state.
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <DeckLogin initial={mode === "signup" ? "signup" : "login"} />;
}
