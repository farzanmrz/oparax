"use client";

import { startTransition, useActionState, useId, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addSource, removeSource, setNoFilter } from "@/lib/settings/actions";
import { settingsContent as copy, type SettingsResult } from "@/lib/settings/content";

export type EditableSource = { id: string; name: string; focus: string; noFilter: boolean };

function SourceRow({
  handle,
  source,
  readOnly,
}: {
  handle: string;
  source: EditableSource;
  readOnly: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [filterState, changeFilter, filterPending] = useActionState<SettingsResult | null, boolean>(
    (_previous, on) => setNoFilter(handle, source.id, on),
    null,
  );
  const [removeState, remove, removePending] = useActionState<SettingsResult | null, FormData>(
    async () => {
      const result = await removeSource(handle, source.id);
      if (result.ok) setOpen(false);
      return result;
    },
    null,
  );
  return (
    <TableRow>
      <TableHead scope="row" className="whitespace-normal font-medium break-words text-foreground">
        {source.name}
      </TableHead>
      <TableCell className="whitespace-normal break-words">
        {source.focus || copy.sources.noFocus}
      </TableCell>
      <TableCell>
        <div className="flex min-h-11 items-center gap-3 desk:min-h-6">
          <Switch
            id={id}
            checked={source.noFilter}
            disabled={readOnly || filterPending}
            className="after:inset-y-1/2 after:h-11 after:-translate-y-1/2 desk:after:h-6"
            aria-label={copy.sources.filterLabel(source.name)}
            onCheckedChange={(on) => startTransition(() => changeFilter(on))}
          />
          <Label htmlFor={id} className="min-h-11 cursor-pointer desk:min-h-6">
            {copy.sources.noFilter}
          </Label>
        </div>
        {filterState && !filterState.ok && (
          <p role="alert" className="text-destructive">
            {filterState.error}
          </p>
        )}
      </TableCell>
      <TableCell>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              disabled={readOnly || filterPending || removePending}
              className="min-h-11 desk:min-h-7"
              aria-label={copy.sources.removeLabel(source.name)}
            >
              {copy.remove}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="overscroll-contain">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-bold">{copy.sources.removeTitle}</AlertDialogTitle>
              <AlertDialogDescription>{copy.sources.removeDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <form action={remove} className="space-y-4" aria-busy={removePending}>
              {removeState && !removeState.ok && (
                <p role="alert" className="text-destructive">
                  {removeState.error}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removePending} className="min-h-11 desk:min-h-7">
                  {copy.cancel}
                </AlertDialogCancel>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={readOnly || removePending}
                  className="min-h-11 desk:min-h-7"
                >
                  {removePending ? copy.removing : copy.remove}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function SourceEditor({
  handle,
  sources,
  readOnly,
}: {
  handle: string;
  sources: EditableSource[];
  readOnly: boolean;
}) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    async (_previous, data) => {
      const result = await addSource(handle, String(data.get("url") ?? ""));
      if (result.ok) setUrl("");
      return result;
    },
    null,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading font-bold">{copy.sources.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sources.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{copy.sources.name}</TableHead>
                <TableHead scope="col">{copy.sources.focus}</TableHead>
                <TableHead scope="col">{copy.sources.noFilter}</TableHead>
                <TableHead scope="col">{copy.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <SourceRow key={source.id} handle={handle} source={source} readOnly={readOnly} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">{copy.sources.empty}</p>
        )}
        <form action={action} className="space-y-3" aria-busy={pending}>
          <Label htmlFor={id}>{copy.sources.url}</Label>
          <div className="flex flex-col gap-3 desk:flex-row">
            <Input
              id={id}
              name="url"
              type="url"
              autoComplete="off"
              spellCheck={false}
              required
              maxLength={2048}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={copy.sources.placeholder}
              disabled={readOnly || pending}
              aria-invalid={state?.ok === false}
              aria-describedby={`${id}-status`}
              className="min-h-11 min-w-0 desk:min-h-7"
            />
            <Button type="submit" disabled={readOnly || pending} className="min-h-11 desk:min-h-7">
              {pending ? copy.sources.adding : copy.sources.add}
            </Button>
          </div>
          <div id={`${id}-status`} aria-live="polite">
            {state &&
              (state.ok ? (
                <p>{copy.sources.added}</p>
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
