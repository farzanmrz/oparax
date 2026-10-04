"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { cardShadow } from "@/components/monitor/item-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { monitorContent as copy } from "@/lib/monitor/content";

export function PayButtons({ monitorId }: { monitorId: string }) {
  const captured = useRef<string | null>(null);
  useEffect(() => {
    if (captured.current === monitorId) return;
    captured.current = monitorId;
    try {
      posthog.capture("paywall_shown", { monitor_id: monitorId });
    } catch {
      // Analytics cannot prevent someone from choosing a plan.
    }
  }, [monitorId]);
  return (
    <div className="grid gap-3 desk:grid-cols-3">
      {copy.plans.map((plan) => (
        <Card key={plan.tier} className={cardShadow}>
          <CardContent className="flex h-full flex-col gap-3">
            <p className="text-sm">{plan.detail}</p>
            <p>{copy.unlimited}</p>
            <form method="post" action="/api/stripe/checkout" className="mt-auto">
              <input type="hidden" name="monitorId" value={monitorId} />
              <input type="hidden" name="tier" value={plan.tier} />
              <Button className="min-h-11 w-full whitespace-normal desk:min-h-6">
                {plan.label}
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
