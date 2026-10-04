import "@/v2/deck/deck.css";

export const metadata = { title: "Oparax | Deck" };

// Nested layout for the Deck direction: only adds the deck stylesheet (see v2/deck/deck.css for why).
export default function DeckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
