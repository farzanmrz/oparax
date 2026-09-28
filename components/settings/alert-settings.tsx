"use client";

import { useActionState, useId, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setAlertHour } from "@/lib/settings/actions";
import { settingsContent as copy, type SettingsResult } from "@/lib/settings/content";

export function AlertSettings({
  handle,
  hour,
  timezone,
  timezones,
  cadence,
  botState,
  failedDeliveries,
  readOnly,
}: {
  handle: string;
  hour: number;
  timezone: string;
  timezones: string[];
  cadence: "daily" | "every_15m";
  botState: string;
  failedDeliveries: number;
  readOnly: boolean;
}) {
  const id = useId();
  const [selectedHour, selectHour] = useState(String(hour));
  const [selectedTimezone, selectTimezone] = useState(timezone);
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    (_previous, data) =>
      setAlertHour(handle, Number(data.get("hour")), String(data.get("timezone") ?? "")),
    null,
  );
  const botCopy =
    botState === "active"
      ? copy.alerts.active
      : botState === "paused"
        ? copy.alerts.paused
        : botState === "stopped"
          ? copy.alerts.stopped
          : copy.alerts.none;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading font-bold">{copy.alerts.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">{copy.alerts.cadence}</dt>
            <dd>{cadence === "daily" ? copy.alerts.daily : copy.alerts.frequent}</dd>
          </div>
          <div>
            <dt className="font-semibold">{copy.alerts.bot}</dt>
            <dd>{botCopy}</dd>
          </div>
        </dl>
        {failedDeliveries > 0 && (
          <Alert variant="destructive">
            <AlertDescription>{copy.alerts.deliveries(failedDeliveries)}</AlertDescription>
          </Alert>
        )}
        {cadence === "every_15m" && (
          <p className="text-muted-foreground">{copy.alerts.frequentNote}</p>
        )}
        <form action={action} className="space-y-4">
          <div className="grid gap-4 desk:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${id}-hour`}>{copy.alerts.hour}</Label>
              <Select
                name="hour"
                value={selectedHour}
                onValueChange={selectHour}
                disabled={readOnly || pending}
              >
                <SelectTrigger id={`${id}-hour`} className="min-h-11 w-full desk:min-h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {copy.alerts.hours.map((value) => (
                    <SelectItem key={value} value={String(value)} className="min-h-11 desk:min-h-7">
                      {copy.alerts.hourLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-timezone`}>{copy.alerts.timezone}</Label>
              <Select
                name="timezone"
                value={selectedTimezone}
                onValueChange={selectTimezone}
                disabled={readOnly || pending}
              >
                <SelectTrigger id={`${id}-timezone`} className="min-h-11 w-full desk:min-h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((zone) => (
                    <SelectItem key={zone} value={zone} className="min-h-11 desk:min-h-7">
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={readOnly || pending} className="min-h-11 desk:min-h-7">
            {pending ? copy.saving : copy.alerts.save}
          </Button>
          <div aria-live="polite">
            {state &&
              (state.ok ? (
                <p>{copy.saved}</p>
              ) : (
                <p role="alert" className="text-destructive">
                  {state.error}
                </p>
              ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
