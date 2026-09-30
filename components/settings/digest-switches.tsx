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
import { followRepo, setDigest, unfollowRepo } from "@/lib/settings/actions";
import { settingsContent as copy, type SettingsResult } from "@/lib/settings/content";
import type { Tables } from "@/lib/supabase/database.types";

export type FollowedRepo = Pick<Tables<"followed_repos">, "repo" | "threshold" | "stars">;

function DigestSwitch({
  handle,
  kind,
  on,
  readOnly,
}: {
  handle: string;
  kind: "github" | "product_hunt";
  on: boolean;
  readOnly: boolean;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<SettingsResult | null, boolean>(
    (_previous, checked) => setDigest(handle, kind, checked),
    null,
  );
  return (
    <div>
      <div className="flex min-h-11 items-center gap-3 desk:min-h-6">
        <Switch
          id={id}
          checked={on}
          disabled={readOnly || pending}
          className="after:inset-y-1/2 after:h-11 after:-translate-y-1/2 desk:after:h-6"
          onCheckedChange={(checked) => startTransition(() => action(checked))}
        />
        <Label htmlFor={id} className="min-h-11 cursor-pointer desk:min-h-6">
          {kind === "github" ? copy.digests.github : copy.digests.productHunt}
        </Label>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}

function RepoRow({
  handle,
  repo,
  readOnly,
}: {
  handle: string;
  repo: FollowedRepo;
  readOnly: boolean;
}) {
  const id = useId();
  const [threshold, setThreshold] = useState(String(repo.threshold));
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    (_previous, data) => followRepo(handle, repo.repo, Number(data.get("threshold"))),
    null,
  );
  const [removeState, remove, removing] = useActionState<SettingsResult | null, FormData>(
    () => unfollowRepo(handle, repo.repo),
    null,
  );
  return (
    <TableRow>
      <TableHead scope="row" className="whitespace-normal break-words text-foreground">
        {repo.repo}
      </TableHead>
      <TableCell className="tabular-nums">
        {repo.stars === null
          ? copy.digests.noStars
          : new Intl.NumberFormat("en").format(repo.stars)}
      </TableCell>
      <TableCell>
        <form action={action} className="space-y-2" aria-busy={pending}>
          <Label htmlFor={id} className="sr-only">
            {copy.digests.thresholdLabel(repo.repo)}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id={id}
              name="threshold"
              type="number"
              inputMode="numeric"
              autoComplete="off"
              required
              min={1}
              max={2147483647}
              step={1}
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              disabled={readOnly || pending || removing}
              aria-invalid={state?.ok === false}
              aria-describedby={`${id}-status`}
              className="min-h-11 min-w-24 tabular-nums desk:min-h-7"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={readOnly || pending || removing}
              className="min-h-11 desk:min-h-7"
            >
              {pending ? copy.saving : copy.save}
            </Button>
          </div>
          <div id={`${id}-status`} aria-live="polite">
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
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={readOnly || pending || removing}
              className="min-h-11 desk:min-h-7"
              aria-label={copy.digests.removeLabel(repo.repo)}
            >
              {copy.remove}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="overscroll-contain">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-bold">{copy.digests.removeTitle}</AlertDialogTitle>
              <AlertDialogDescription>{copy.digests.removeDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <form action={remove} className="space-y-3" aria-busy={removing}>
              {removeState && !removeState.ok && (
                <p role="alert" className="text-destructive">
                  {removeState.error}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removing} className="min-h-11 desk:min-h-7">
                  {copy.cancel}
                </AlertDialogCancel>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={readOnly || pending || removing}
                  className="min-h-11 desk:min-h-7"
                >
                  {removing ? copy.removing : copy.remove}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function DigestSwitches({
  handle,
  github,
  productHunt,
  repos,
  readOnly,
}: {
  handle: string;
  github: boolean;
  productHunt: boolean;
  repos: FollowedRepo[];
  readOnly: boolean;
}) {
  const id = useId();
  const [repo, setRepo] = useState("");
  const [threshold, setThreshold] = useState(String(copy.digests.defaultThreshold));
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    async (_previous, data) => {
      const result = await followRepo(
        handle,
        String(data.get("repo") ?? ""),
        Number(data.get("threshold")),
      );
      if (result.ok) setRepo("");
      return result;
    },
    null,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading font-bold">{copy.digests.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <DigestSwitch handle={handle} kind="github" on={github} readOnly={readOnly} />
          <DigestSwitch handle={handle} kind="product_hunt" on={productHunt} readOnly={readOnly} />
        </div>
        <h3 className="font-heading font-bold">{copy.digests.repositories}</h3>
        {repos.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{copy.digests.repo}</TableHead>
                <TableHead scope="col">{copy.digests.stars}</TableHead>
                <TableHead scope="col">{copy.digests.threshold}</TableHead>
                <TableHead scope="col">{copy.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repos.map((entry) => (
                <RepoRow
                  key={`${entry.repo}:${entry.threshold}`}
                  handle={handle}
                  repo={entry}
                  readOnly={readOnly}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">{copy.digests.empty}</p>
        )}
        <form action={action} className="space-y-3">
          <div className="grid gap-4 desk:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${id}-repo`}>{copy.digests.repo}</Label>
              <Input
                id={`${id}-repo`}
                name="repo"
                value={repo}
                onChange={(event) => setRepo(event.target.value)}
                required
                maxLength={140}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={copy.digests.placeholder}
                disabled={readOnly || pending}
                aria-invalid={state?.ok === false}
                aria-describedby={`${id}-status`}
                className="min-h-11 desk:min-h-7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-threshold`}>{copy.digests.threshold}</Label>
              <Input
                id={`${id}-threshold`}
                name="threshold"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                required
                min={1}
                max={2147483647}
                step={1}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                disabled={readOnly || pending}
                aria-invalid={state?.ok === false}
                aria-describedby={`${id}-status`}
                className="min-h-11 tabular-nums desk:min-h-7"
              />
            </div>
          </div>
          <Button type="submit" disabled={readOnly || pending} className="min-h-11 desk:min-h-7">
            {pending ? copy.digests.adding : copy.digests.add}
          </Button>
          <div id={`${id}-status`} aria-live="polite">
            {state &&
              (state.ok ? (
                <p>{copy.digests.added}</p>
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
