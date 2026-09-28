"use client";

import { useActionState, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openPortal } from "@/lib/settings/actions";
import { settingsContent as copy, type SettingsResult } from "@/lib/settings/content";

export function BillingCard({
  handle,
  monitorId,
  tier,
  paidThrough,
  lapsed,
  available,
}: {
  handle: string;
  monitorId: string;
  tier: string;
  paidThrough: string | null;
  lapsed: boolean;
  available: boolean;
}) {
  const portalForm = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(async () => {
    const result = await openPortal(handle);
    if (result.ok && portalForm.current) {
      portalForm.current.action = result.url;
      portalForm.current.submit();
    }
    return result;
  }, null);
  const tierName =
    tier === "free" || tier === "hobby" || tier === "creator" || tier === "wire"
      ? copy.billing.tiers[tier]
      : copy.billing.unknownTier;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading font-bold">{copy.billing.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lapsed && (
          <Alert variant="destructive">
            <AlertDescription>{copy.billing.lapsed}</AlertDescription>
          </Alert>
        )}
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">{copy.billing.tier}</dt>
            <dd>{tierName}</dd>
          </div>
          <div>
            <dt className="font-semibold">{copy.billing.through}</dt>
            <dd>
              {paidThrough ? (
                <time dateTime={paidThrough} className="font-mono">
                  {new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(
                    new Date(paidThrough),
                  )}
                </time>
              ) : (
                copy.billing.none
              )}
            </dd>
          </div>
        </dl>
        <form ref={portalForm} action="/api/stripe/portal" method="post" hidden>
          <input type="hidden" name="monitorId" value={monitorId} />
        </form>
        <form action={action} className="space-y-3">
          <Button type="submit" disabled={!available || pending} className="min-h-11 desk:min-h-7">
            {pending ? copy.billing.opening : copy.billing.manage}
          </Button>
          {!available && <p className="text-muted-foreground">{copy.errors.billing}</p>}
          {state && !state.ok && (
            <p role="alert" className="text-destructive">
              {state.error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
