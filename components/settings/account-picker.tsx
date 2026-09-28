"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useId } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { refreshCounts, setWatched } from "@/lib/settings/actions";
import { settingsContent as copy, type SettingsResult } from "@/lib/settings/content";
import type { Tables } from "@/lib/supabase/database.types";

export type EditableAccount = Pick<
  Tables<"monitor_accounts">,
  "handle" | "name" | "watched" | "posts_per_day" | "counts_checked_at"
>;
const number = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

function AccountRow({
  handle,
  account,
  readOnly,
}: {
  handle: string;
  account: EditableAccount;
  readOnly: boolean;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<SettingsResult | null, boolean>(
    (_previous, on) => setWatched(handle, account.handle, on),
    null,
  );
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <p className="font-mono">{copy.accounts.handle(account.handle)}</p>
        <p className="break-words text-muted-foreground">{account.name}</p>
      </TableCell>
      <TableCell>
        <div className="flex min-h-11 items-center gap-3 desk:min-h-6">
          <Checkbox
            id={id}
            checked={account.watched}
            disabled={readOnly || pending}
            className="after:inset-y-1/2 after:h-11 after:-translate-y-1/2 desk:after:h-6"
            aria-label={copy.accounts.watchLabel(account.handle)}
            onCheckedChange={(on) => startTransition(() => action(on === true))}
          />
          <Label htmlFor={id} className="min-h-11 cursor-pointer desk:min-h-6">
            {copy.accounts.watch}
          </Label>
        </div>
        {state && !state.ok && (
          <p role="alert" className="text-destructive">
            {state.error}
          </p>
        )}
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {account.posts_per_day === null
          ? copy.accounts.unknown
          : number.format(account.posts_per_day)}
      </TableCell>
      <TableCell>
        {account.counts_checked_at ? (
          <time dateTime={account.counts_checked_at}>
            {date.format(new Date(account.counts_checked_at))}
          </time>
        ) : (
          copy.accounts.neverChecked
        )}
      </TableCell>
    </TableRow>
  );
}

export function AccountPicker({
  handle,
  accounts,
  used,
  limit,
  readOnly,
}: {
  handle: string;
  accounts: EditableAccount[];
  used: number;
  limit: number;
  readOnly: boolean;
}) {
  const router = useRouter();
  const watched = accounts.filter((account) => account.watched);
  const daily = watched.reduce((total, account) => total + (account.posts_per_day ?? 0), 0);
  const high = watched.filter(
    (account) =>
      account.posts_per_day !== null && account.posts_per_day * 10 > Math.max(0, limit - used),
  );
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    () => refreshCounts(handle),
    null,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading font-bold">{copy.accounts.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-mono tabular-nums" aria-live="polite">
          {copy.accounts.summary(number.format(daily), number.format(used), number.format(limit))}
        </p>
        {watched.some((account) => account.posts_per_day === null) && (
          <p className="text-muted-foreground">{copy.accounts.unknownNote}</p>
        )}
        {high.length > 0 && (
          <Alert className="border-amber-600/50 text-amber-800 dark:text-amber-300 [&_[data-slot=alert-description]]:text-inherit">
            <AlertTitle>{copy.accounts.warningTitle}</AlertTitle>
            <AlertDescription>
              {copy.accounts.warning(
                high.map((account) => copy.accounts.handle(account.handle)).join(", "),
              )}
            </AlertDescription>
          </Alert>
        )}
        {accounts.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{copy.accounts.name}</TableHead>
                <TableHead scope="col">{copy.accounts.watch}</TableHead>
                <TableHead scope="col">{copy.accounts.rate}</TableHead>
                <TableHead scope="col">{copy.accounts.checked}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <AccountRow
                  key={account.handle}
                  handle={handle}
                  account={account}
                  readOnly={readOnly}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">{copy.accounts.empty}</p>
        )}
        <form action={action} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={readOnly || pending || !accounts.length}
              className="min-h-11 desk:min-h-7"
            >
              {pending ? copy.accounts.refreshing : copy.accounts.refresh}
            </Button>
            {state?.ok && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.refresh()}
                className="min-h-11 desk:min-h-7"
              >
                {copy.accounts.reload}
              </Button>
            )}
          </div>
          <div aria-live="polite">
            {state &&
              (state.ok ? (
                <p>{copy.accounts.queued}</p>
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
