import { Mail, MessageSquareText, Newspaper, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { nextStory } from "../data/feed";

// One composition, not a grid: sources on the left, one small story in the middle, destinations on the
// right. Solid lines work today; dashed lines and dashed rows are planned, with no per-row label (owner,
// October 1). Center Flow and Circles were inspiration only. Official artwork keeps its own colors.
// Round 2 item R2-3: GitHub and Product Hunt never join a story today, so their lines end at a separate
// "Daily digest" label under the card, with nothing onward to destinations.

type Node = {
  name: string;
  note: string;
  logo?: string;
  logoDark?: string;
  icon?: typeof Rss;
  planned?: boolean;
  digest?: boolean;
};

const sourcesIn: Node[] = [
  { name: "X", note: "Posts from your watched accounts", logo: "/roadmap-brands/x.png" },
  { name: "Websites and RSS", note: "Articles from your sites and feeds", icon: Rss },
  {
    name: "GitHub",
    note: "Daily digest",
    logo: "/roadmap-brands/github.svg",
    logoDark: "/roadmap-brands/github-white.svg",
    digest: true,
  },
  { name: "Product Hunt", note: "Daily digest", logo: "/roadmap-brands/producthunt.png", digest: true },
  { name: "Reddit", note: "", logo: "/roadmap-brands/reddit.png", planned: true },
  { name: "YouTube", note: "", logo: "/roadmap-brands/youtube.png", planned: true },
  { name: "Instagram", note: "", logo: "/roadmap-brands/instagram.webp", planned: true },
  { name: "Facebook", note: "", logo: "/roadmap-brands/facebook.png", planned: true },
  { name: "Threads", note: "", logo: "/roadmap-brands/threads.webp", planned: true },
  { name: "LinkedIn", note: "", logo: "/roadmap-brands/linkedin.png", planned: true },
  { name: "TikTok", note: "", logo: "/roadmap-brands/tiktok-app.png", planned: true },
  { name: "Snapchat", note: "", logo: "/roadmap-brands/snapchat.png", planned: true },
  { name: "Yahoo Finance", note: "", logo: "/roadmap-brands/yahoofinance.png", planned: true },
  { name: "Google News", note: "", logo: "/roadmap-brands/googlenews.png", planned: true },
];

const sendsTo: Node[] = [
  { name: "X DM", note: "Your stories as a direct message", logo: "/roadmap-brands/x.png" },
  { name: "Email", note: "", icon: Mail, planned: true },
  { name: "SMS", note: "", icon: MessageSquareText, planned: true },
  { name: "WhatsApp", note: "", logo: "/roadmap-brands/whatsapp-app.png", planned: true },
  { name: "Messenger", note: "", logo: "/roadmap-brands/messenger.png", planned: true },
  { name: "Instagram", note: "", logo: "/roadmap-brands/instagram.webp", planned: true },
  { name: "Threads", note: "", logo: "/roadmap-brands/threads.webp", planned: true },
  { name: "LinkedIn", note: "", logo: "/roadmap-brands/linkedin.png", planned: true },
  { name: "Snapchat", note: "", logo: "/roadmap-brands/snapchat.png", planned: true },
];

const ROW = 44;
const GAP = 8;
const LINK = 180;
const heightOf = (n: number) => n * ROW + (n - 1) * GAP;
const H = heightOf(sourcesIn.length);
const MID = H / 2;
const outTop = (H - heightOf(sendsTo.length)) / 2;
/** The story card is 64px tall around MID; the digest label sits just below it. */
const DIGEST_H = 24;
const DIGEST_Y = MID + 32 + 10 + DIGEST_H / 2;

function Logo({ node }: { node: Node }) {
  if (node.icon) {
    const Icon = node.icon;
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="grid size-7 shrink-0 place-items-center">
      <img src={node.logo} alt="" className={cn("size-7 rounded-lg object-contain", node.logoDark && "dark:hidden")} />
      {node.logoDark ? <img src={node.logoDark} alt="" className="hidden size-7 object-contain dark:block" /> : null}
    </span>
  );
}

function Row({ node, align }: { node: Node; align: "left" | "right" }) {
  return (
    <li
      style={{ height: ROW }}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3",
        node.planned ? "border-dashed border-border bg-transparent" : "border-border bg-card",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <Logo node={node} />
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className={cn("font-medium", node.planned && "text-muted-foreground")}>{node.name}</span>
        {node.note ? <span className="ml-2 text-xs text-muted-foreground">{node.note}</span> : null}
      </span>
    </li>
  );
}

function Links({ nodes, side, top }: { nodes: Node[]; side: "in" | "out"; top: number }) {
  return (
    <svg width={LINK} height={H} className="shrink-0 overflow-visible" aria-hidden="true">
      {nodes.map((node, i) => {
        const y = top + i * (ROW + GAP) + ROW / 2;
        const end = node.digest ? DIGEST_Y : MID;
        const d =
          side === "in"
            ? `M 0 ${y} C ${LINK * 0.6} ${y}, ${LINK * 0.4} ${end}, ${LINK} ${end}`
            : `M 0 ${MID} C ${LINK * 0.6} ${MID}, ${LINK * 0.4} ${y}, ${LINK} ${y}`;
        return (
          <path
            key={node.name}
            d={d}
            fill="none"
            strokeWidth={node.planned ? 1 : 1.75}
            strokeDasharray={node.planned ? "3 5" : undefined}
            className={node.planned ? "stroke-border" : "stroke-muted-foreground/60"}
          />
        );
      })}
    </svg>
  );
}

/** The middle: one small story, sized like a source row (headline and "Used N sources" only, no glow). */
function MiniStory() {
  const n = nextStory.items.length;
  return (
    <div className="w-[230px] rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="truncate text-sm font-medium">{nextStory.card.headline}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="flex -space-x-1" aria-hidden="true">
          {nextStory.items.map((item) => (
            <span
              key={item.id}
              className="grid size-4 place-items-center rounded-full border border-border bg-card text-foreground ring-2 ring-card"
            >
              {item.kind === "post" ? <XLogo className="size-2" /> : <Newspaper className="size-2" />}
            </span>
          ))}
        </span>
        Used {n} sources
      </p>
    </div>
  );
}

export function Roadmap() {
  return (
    <section id="roadmap" className="scroll-mt-16 border-b border-border py-20">
      <div className="mx-auto w-[90%] max-w-[1800px]">
        <h2 className="text-3xl font-semibold tracking-tight">Roadmap</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">Where your agent reads, and where you get your stories.</p>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <svg width="28" height="2" aria-hidden="true">
            <line x1="0" y1="1" x2="28" y2="1" strokeWidth="1.75" className="stroke-muted-foreground/60" />
          </svg>
          Solid lines work today. Dashed lines are planned.
          <svg width="28" height="2" aria-hidden="true">
            <line x1="0" y1="1" x2="28" y2="1" strokeWidth="1" strokeDasharray="3 5" className="stroke-muted-foreground" />
          </svg>
        </p>
        <div className="mx-auto mt-12 flex max-w-[1240px] items-start justify-center">
          <ul className="w-[330px] shrink-0 space-y-2" aria-label="Sources">
            {sourcesIn.map((node) => (
              <Row key={node.name} node={node} align="left" />
            ))}
          </ul>
          <Links nodes={sourcesIn} side="in" top={0} />
          <div className="relative flex shrink-0 items-center" style={{ height: H }}>
            <MiniStory />
            <span
              className="absolute left-0 flex items-center rounded-md border border-border bg-card px-2 text-xs text-muted-foreground"
              style={{ top: DIGEST_Y - DIGEST_H / 2, height: DIGEST_H }}
            >
              Daily digest
            </span>
          </div>
          <Links nodes={sendsTo} side="out" top={outTop} />
          <ul className="w-[300px] shrink-0 space-y-2" style={{ paddingTop: outTop }} aria-label="Destinations">
            {sendsTo.map((node) => (
              <Row key={node.name} node={node} align="right" />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
