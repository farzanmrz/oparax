import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Pricing as a comparison: grouped rows and status chips adapted from React Bits Pro comparison-8.
// Round 1 change 5: no heat ramp (blue is not a quantity); the watched-posts row leads by type weight only,
// and one Sign Up sits under the table. Values: lib/landing/content.ts.

const tiers = [
  { name: "Hobby", price: "$5", posts: "100" },
  { name: "Creator", price: "$30", posts: "3,000" },
  { name: "Wire", price: "$99", posts: "4,000" },
];

const rows: { label: string; cells: [string, string, string]; included?: boolean }[] = [
  { label: "Alerts on X", cells: ["Daily", "Daily", "Every 15 minutes when there is news"] },
  { label: "Sites and RSS feeds", cells: ["Unlimited", "Unlimited", "Unlimited"], included: true },
  { label: "Stories with original sources", cells: ["Included", "Included", "Included"], included: true },
  { label: "GitHub discovery digest", cells: ["Optional, daily", "Optional, daily", "Optional, daily"] },
  { label: "Product Hunt digest", cells: ["Optional, daily", "Optional, daily", "Optional, daily"] },
];

const grid = "grid grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(0,1fr))]";

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 py-20">
      <div className="mx-auto w-[90%] max-w-[1800px]">
        <h2 className="text-3xl font-semibold tracking-tight">Pick your pace</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every plan includes your story feed and unlimited sites and feeds. Choose how much of X to watch and how often
          to hear from us.
        </p>

        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
          <div className={cn(grid, "border-b border-border")}>
            <div className="px-6 py-5 text-sm text-muted-foreground">Every plan starts with a free week: 7 days and 300 watched X posts, no card.</div>
            {tiers.map((tier) => (
              <div key={tier.name} className="border-l border-border px-6 py-5">
                <p className="font-semibold">{tier.name}</p>
                <p className="mt-1">
                  <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">a month</span>
                </p>
              </div>
            ))}
          </div>

          <div className={cn(grid, "border-b border-border")}>
            <div className="px-6 py-5">
              <p className="font-semibold">Watched X posts a month</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Posts from the X accounts your agent watches. Sites and feeds never count.
              </p>
            </div>
            {tiers.map((tier) => (
              <div key={tier.name} className="flex items-center border-l border-border px-6 py-5">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{tier.posts}</span>
              </div>
            ))}
          </div>

          {rows.map((row, r) => (
            <div key={row.label} className={cn(grid, r < rows.length - 1 && "border-b border-border")}>
              <div className="px-6 py-4 text-sm font-medium">{row.label}</div>
              {row.cells.map((cell, i) => (
                <div key={i} className="flex items-center gap-2.5 border-l border-border px-6 py-4 text-sm">
                  {row.included ? (
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border bg-muted text-foreground">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                  ) : null}
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button asChild className="h-11 px-6 text-sm">
            <Link href="/next/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
