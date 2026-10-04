import Link from "next/link";
import { readParams, type SearchParams } from "@/next/frame";
import { TopBar } from "@/next/council/chrome";

export const metadata = { title: "Oparax | Three feed directions" };

// The comparison page for the three council directions (council-design/agreed.md). Thumbnails are the
// dark viewport renders copied into public/council/; each card links to its live route.

const directions = [
  {
    href: "/next/feed/window",
    name: "Window",
    image: "/council/window-dark.png",
    sentence:
      "The feed as one lit app window, like Linear's: your sources down the left, stories in a list, the open story large with each report as its own row, and status tiles on the right.",
  },
  {
    href: "/next/feed/newsroom",
    name: "Newsroom",
    image: "/council/newsroom-dark.png",
    sentence:
      "Supabase dashboard logic: every report is a row in one table with kind, sources and time, a row opens in place to its facts and quoted evidence, and status tiles and a chart sit beside it.",
  },
  {
    href: "/next/feed/deck",
    name: "Deck",
    image: "/council/deck-dark.png",
    sentence:
      "Four slim tiles on top, then stories as cards with images, where a story built from several reports is a stack with the other reports peeking behind it.",
  },
];

export default async function DirectionsPage({ searchParams }: { searchParams: SearchParams }) {
  const theme = (await readParams(searchParams))("theme");
  const q = theme === "light" || theme === "dark" ? `?theme=${theme}` : "";
  return (
    <div className="palette-council flex min-h-svh flex-col">
      <TopBar title="Three feed directions" />
      <main className="mx-auto w-full max-w-[1360px] px-10 pt-10 pb-16">
        <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Three feed directions</h1>
        <p className="mt-3 max-w-[70ch] text-[14px] text-t3">
          The same stories, sources and status in three layouts. Each opens in dark; the sun and moon button in the top bar
          switches to light.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-6">
          {directions.map((d) => (
            <Link
              key={d.href}
              href={`${d.href}${q}`}
              className="group overflow-hidden rounded-xl border border-line-strong bg-[var(--window)] transition-transform hover:-translate-y-0.5"
              style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}
            >
              <div className="aspect-[1440/900] overflow-hidden border-b border-line bg-[var(--well)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.image} alt={`${d.name} direction, dark`} className="size-full object-cover object-top" />
              </div>
              <div className="p-5">
                <p className="text-[17px] font-semibold text-t1 group-hover:text-[var(--brand)]">{d.name}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-t2">{d.sentence}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
