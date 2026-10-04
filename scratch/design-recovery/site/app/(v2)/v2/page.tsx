const DIRECTIONS = [
  { key: "window", name: "Window", line: "A lifted app window on a lit stage; every story open in one reading column with its sources beside it." },
  { key: "newsroom", name: "Newsroom", line: "One lifted table, full width, every row with its full headline, every fact and one picture-sized media object." },
  { key: "deck", name: "Deck", line: "Status tiles, then stories as physical stacks: a readable front card with its other articles peeking behind." },
];
const SCREENS = ["landing", "signup", "setup", "building", "ready", "feed"];

export const metadata = { title: "Oparax | Pick a direction" };

export default function V2Index() {
  return (
    <div className="palette-council min-h-svh px-10 py-12">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-t1">Pick one direction</h1>
      <p className="mt-2 text-[13.5px] text-t3">Each direction runs the whole flow: landing, sign up, setup, building, ready, feed. Add ?theme=light to any page.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {DIRECTIONS.map((d) => (
          <div key={d.key} className="rounded-[14px] border border-line bg-[var(--window)] p-6" style={{ boxShadow: "var(--card-shadow)" }}>
            <h2 className="text-[20px] font-semibold text-t1">{d.name}</h2>
            <p className="mt-2 text-[13px] text-t2">{d.line}</p>
            <ol className="mt-5 grid gap-1.5">
              {SCREENS.map((s, i) => (
                <li key={s}>
                  <a className="flex items-center gap-3 rounded-md px-2 py-1.5 text-[13.5px] text-t1 hover:bg-raised" href={`/v2/${d.key}/${s}`}>
                    <span className="font-mono text-[11px] text-t3">{i + 1}</span>
                    {s[0].toUpperCase() + s.slice(1)}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
