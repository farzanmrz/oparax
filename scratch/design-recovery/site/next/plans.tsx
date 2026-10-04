import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { plans } from "./copy";

// The three plan cards from components/monitor/pay-buttons.tsx: detail line, "Sites and feeds unlimited.",
// then the button with the plan label. No featured tier: the product marks none.
export function PlanCards({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {plans.map((plan) => (
        <div key={plan.tier} className="flex flex-col rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold">{plan.name}</p>
          <p className="mt-2 text-sm">{plan.detail}</p>
          <p className="mt-1 text-sm text-muted-foreground">Sites and feeds unlimited.</p>
          <Button className="mt-4 h-9 w-full text-sm">{plan.label}</Button>
        </div>
      ))}
    </div>
  );
}
