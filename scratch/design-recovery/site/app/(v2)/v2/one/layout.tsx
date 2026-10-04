import "@/v2/one/one.css";

export const metadata = { title: "Oparax | One" };

// Nested layout for the One direction: only adds its stylesheet (see v2/one/one.css for why).
export default function OneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
