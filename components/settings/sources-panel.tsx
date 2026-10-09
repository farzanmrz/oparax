"use client";

// The settings aside (council, October 8): the agent's sources in the Deck's source list, each kind under its small
// label with its Add control (the existing add flows), one line per source (logo, name, handle or host) with a quiet
// remove x, and Watch on Twitter accounts. Three per kind, then Show more; a row that could not be read stays in view
// with its message in red. A row opens in place to its reason and its own controls. Adding and removing need only
// the sign-up (owner, October 6); every change goes through the existing settings actions.

import { Check, X as CloseIcon, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, startTransition, useActionState, useId, useState } from "react";
import { SourceMark } from "@/components/one/marks";
import {
  AsideTitle,
  GroupLabel,
  RowName,
  SHOWN,
  ShowMore,
  useShowMore,
  visibleRows,
} from "@/components/one/source-list";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { monitorContent } from "@/lib/monitor/content";
import {
  addSource,
  followRepo,
  refreshCounts,
  removeSource,
  setNoFilter,
  setWatched,
  unfollowRepo,
} from "@/lib/settings/actions";
import { settingsContent as copy, type SettingsResult } from "@/lib/settings/content";
import type { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export type SettingsSource = {
  id: string;
  kind: "rss" | "website";
  name: string;
  host: string;
  focus: string;
  why: string;
  noFilter: boolean;
  /** An unreadable or paused line, when the source has one. */
  note: string | null;
};
export type SettingsAccount = Pick<
  Tables<"monitor_accounts">,
  "handle" | "name" | "why" | "watched" | "posts_per_day" | "counts_checked_at"
>;
export type FollowedRepo = Pick<Tables<"followed_repos">, "repo" | "threshold" | "stars">;

const groups = monitorContent.onboarding.groups;
const number = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

const smallButton =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line-strong bg-[var(--window)] px-2.5 text-[12.5px] font-medium text-t2 shadow-[var(--top-light)] transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";
const quietButton =
  "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";
export const field =
  "h-8 w-full min-w-0 rounded-md border border-line-strong bg-well px-2.5 text-[13px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] disabled:opacity-60 aria-invalid:border-[var(--error)]";
const note = "text-[12px] leading-[1.5]";

/** A result line under a control: the error as an alert, or the success words when given. */
function Result({ state, done }: { state: SettingsResult | null; done?: string }) {
  if (!state) return null;
  if (!state.ok)
    return (
      <p role="alert" className={cn(note, "text-[var(--error)]")}>
        {state.error}
      </p>
    );
  return done ? <p className={cn(note, "text-t2")}>{done}</p> : null;
}

function AddButton({
  open,
  onClick,
  label,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={label}
      onClick={onClick}
      className={quietButton}
    >
      <Plus className="size-3" aria-hidden="true" />
      {monitorContent.aside.add}
    </button>
  );
}

/** One line: the mark, the name and address, the row's controls at the right; its detail opens under it. */
function Row({
  mark,
  name,
  address,
  noteLine,
  control,
  detail,
  open,
  onToggle,
}: {
  mark: ReactNode;
  name: string;
  address: string;
  noteLine?: string | null;
  control: ReactNode;
  detail: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={cn(
        "group/row rounded-md transition-colors",
        open ? "bg-raised" : "hover:bg-raised focus-within:bg-raised",
      )}
    >
      <div className="flex min-h-8 items-center pr-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-8 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-ring"
        >
          {mark}
          <RowName name={name} address={address} />
        </button>
        {control}
      </div>
      {noteLine ? (
        <p className={cn(note, "-mt-1 pr-2 pb-1 pl-[36px] text-[var(--error)]")}>{noteLine}</p>
      ) : null}
      {open ? <div className="grid gap-2 pr-2 pb-2.5 pl-[36px]">{detail}</div> : null}
    </li>
  );
}

/** The quiet x at the right of a row, shown on hover and focus. */
function RemoveX({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-6 shrink-0 place-items-center rounded-md text-t3 opacity-0 transition-[opacity,color] group-focus-within/row:opacity-100 group-hover/row:opacity-100 hover:text-[var(--error)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <CloseIcon className="size-3.5" aria-hidden="true" />
    </button>
  );
}

/** The existing confirm step before a removal. */
function ConfirmRemove({
  open,
  onOpenChange,
  title,
  description,
  remove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  remove: () => Promise<SettingsResult>;
}) {
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(async () => {
    const result = await remove();
    if (result.ok) onOpenChange(false);
    return result;
  }, null);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overscroll-contain">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action} className="space-y-4" aria-busy={pending}>
          <Result state={state} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{copy.cancel}</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? copy.removing : copy.remove}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LoadError() {
  return <p className={cn(note, "px-2 pb-1 text-[var(--error)]")}>{copy.loadError}</p>;
}

function AccountRow({
  handle,
  account,
  open,
  onToggle,
}: {
  handle: string;
  account: SettingsAccount;
  open: boolean;
  onToggle: () => void;
}) {
  const [state, action, pending] = useActionState<SettingsResult | null, boolean>(
    (_previous, on) => setWatched(handle, account.handle, on),
    null,
  );
  return (
    <Row
      mark={<SourceMark kind="x" mark={account.handle} size={18} />}
      name={account.name || copy.accounts.handle(account.handle)}
      address={copy.accounts.handle(account.handle)}
      open={open || Boolean(state && !state.ok)}
      onToggle={onToggle}
      control={
        <button
          type="button"
          aria-pressed={account.watched}
          aria-label={copy.accounts.watchLabel(account.handle)}
          disabled={pending}
          onClick={() => startTransition(() => action(!account.watched))}
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11.5px] transition-[opacity,color] hover:text-t1 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring",
            account.watched
              ? "text-t2"
              : "text-t3 opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100",
          )}
        >
          {account.watched ? (
            <Check className="size-3 text-[var(--brand)]" aria-hidden="true" />
          ) : null}
          {account.watched ? monitorContent.watched : copy.accounts.watch}
        </button>
      }
      detail={
        <>
          {account.why ? <p className={cn(note, "text-t2")}>{account.why}</p> : null}
          <p className={cn(note, "grid text-t3 tabular-nums")}>
            <span>
              {copy.accounts.rate}{" "}
              <span className="text-t1">
                {account.posts_per_day === null
                  ? copy.accounts.unknown
                  : number.format(account.posts_per_day)}
              </span>
            </span>
            <span>
              {copy.accounts.checked}{" "}
              <span className="text-t1">
                {account.counts_checked_at
                  ? date.format(new Date(account.counts_checked_at))
                  : copy.accounts.neverChecked}
              </span>
            </span>
          </p>
          <Result state={state} />
        </>
      }
    />
  );
}

function SourceRow({
  handle,
  source,
  open,
  onToggle,
}: {
  handle: string;
  source: SettingsSource;
  open: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const [confirm, setConfirm] = useState(false);
  const [filterState, changeFilter, filterPending] = useActionState<SettingsResult | null, boolean>(
    (_previous, on) => setNoFilter(handle, source.id, on),
    null,
  );
  return (
    <Row
      mark={<SourceMark kind="site" mark={source.host} size={18} />}
      name={source.name}
      address={source.host}
      noteLine={source.note}
      open={open}
      onToggle={onToggle}
      control={
        <>
          <RemoveX label={copy.sources.removeLabel(source.name)} onClick={() => setConfirm(true)} />
          <ConfirmRemove
            open={confirm}
            onOpenChange={setConfirm}
            title={copy.sources.removeTitle}
            description={copy.sources.removeDescription}
            remove={() => removeSource(handle, source.id)}
          />
        </>
      }
      detail={
        <>
          {source.focus ? <p className={cn(note, "text-t1")}>{source.focus}</p> : null}
          {source.why ? <p className={cn(note, "text-t2")}>{source.why}</p> : null}
          <div className="flex items-center gap-2.5 pt-0.5">
            <Switch
              id={id}
              checked={source.noFilter}
              disabled={filterPending}
              aria-label={copy.sources.filterLabel(source.name)}
              onCheckedChange={(on) => startTransition(() => changeFilter(on))}
            />
            <label htmlFor={id} className="cursor-pointer text-[12px] text-t2">
              {copy.sources.noFilter}
            </label>
          </div>
          <Result state={filterState} />
        </>
      }
    />
  );
}

function RepoRow({
  handle,
  repo,
  open,
  onToggle,
}: {
  handle: string;
  repo: FollowedRepo;
  open: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const [confirm, setConfirm] = useState(false);
  const [threshold, setThreshold] = useState(String(repo.threshold));
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    (_previous, data) => followRepo(handle, repo.repo, Number(data.get("threshold"))),
    null,
  );
  return (
    <Row
      mark={<SourceMark kind="github" mark={repo.repo} size={18} />}
      name={repo.repo}
      address={repo.repo}
      open={open}
      onToggle={onToggle}
      control={
        <>
          <RemoveX label={copy.digests.removeLabel(repo.repo)} onClick={() => setConfirm(true)} />
          <ConfirmRemove
            open={confirm}
            onOpenChange={setConfirm}
            title={copy.digests.removeTitle}
            description={copy.digests.removeDescription}
            remove={() => unfollowRepo(handle, repo.repo)}
          />
        </>
      }
      detail={
        <>
          <p className={cn(note, "text-t3 tabular-nums")}>
            {copy.digests.stars}{" "}
            <span className="text-t1">
              {repo.stars === null
                ? copy.digests.noStars
                : new Intl.NumberFormat("en").format(repo.stars)}
            </span>
          </p>
          <form action={action} className="grid gap-1.5" aria-busy={pending}>
            <label htmlFor={id} className="text-[12px] text-t2">
              {copy.digests.threshold}
            </label>
            <div className="flex gap-2">
              <input
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
                disabled={pending}
                aria-invalid={state?.ok === false}
                className={cn(field, "tabular-nums")}
              />
              <button type="submit" disabled={pending} className={cn(smallButton, "h-8")}>
                {pending ? copy.saving : copy.save}
              </button>
            </div>
          </form>
          <Result state={state} done={copy.saved} />
        </>
      }
    />
  );
}

/** The existing add flow for a site or feed: its address, checked and classified by the server. */
function AddSource({ handle }: { handle: string }) {
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
    <form action={action} className="grid gap-1.5 px-2 pb-2" aria-busy={pending}>
      <label htmlFor={id} className="text-[12px] text-t2">
        {copy.sources.url}
      </label>
      <input
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
        disabled={pending}
        aria-invalid={state?.ok === false}
        className={field}
      />
      <button type="submit" disabled={pending} className={cn(smallButton, "justify-self-start")}>
        {pending ? copy.sources.adding : copy.sources.add}
      </button>
      <div aria-live="polite">
        <Result state={state} done={copy.sources.added} />
      </div>
    </form>
  );
}

/** The existing follow flow for a GitHub repository and its star threshold. */
function FollowRepo({ handle }: { handle: string }) {
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
    <form action={action} className="grid gap-1.5 px-2 pb-2" aria-busy={pending}>
      <label className="grid gap-1 text-[12px] text-t2">
        {copy.digests.repo}
        <input
          name="repo"
          value={repo}
          onChange={(event) => setRepo(event.target.value)}
          required
          maxLength={140}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={copy.digests.placeholder}
          disabled={pending}
          aria-invalid={state?.ok === false}
          className={field}
        />
      </label>
      <label className="grid gap-1 text-[12px] text-t2">
        {copy.digests.threshold}
        <input
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
          disabled={pending}
          className={cn(field, "tabular-nums")}
        />
      </label>
      <button type="submit" disabled={pending} className={cn(smallButton, "justify-self-start")}>
        {pending ? copy.digests.adding : copy.digests.add}
      </button>
      <div aria-live="polite">
        <Result state={state} done={copy.digests.added} />
      </div>
    </form>
  );
}

/** Refresh the watched accounts' posting rates (a paid plan's Twitter calls), then reload once the job has run. */
function RefreshCounts({ handle }: { handle: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    () => refreshCounts(handle),
    null,
  );
  return (
    <form action={action} aria-busy={pending}>
      {state?.ok ? (
        <button type="button" onClick={() => router.refresh()} className={quietButton}>
          {copy.accounts.reload}
        </button>
      ) : (
        <button
          type="submit"
          disabled={pending}
          aria-label={copy.accounts.refresh}
          title={copy.accounts.refresh}
          className={quietButton}
        >
          <RefreshCw className={cn("size-3", pending && "animate-spin")} aria-hidden="true" />
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {state?.ok ? copy.accounts.queued : state ? state.error : null}
      </span>
    </form>
  );
}

export function SourcesPanel({
  handle,
  paid,
  sources,
  accounts,
  repos,
  poolLeft,
}: {
  handle: string;
  /** Counts refresh only on a paid plan. */
  paid: boolean;
  /** Each list is null when its read failed. */
  sources: SettingsSource[] | null;
  accounts: SettingsAccount[] | null;
  repos: FollowedRepo[] | null;
  /** Watched Twitter posts left in the current period, for the high-rate warning. */
  poolLeft: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<"rss" | "website" | "github" | null>(null);
  const more = useShowMore();
  const toggle = (key: string) => setOpen(open === key ? null : key);
  const high = (accounts ?? []).filter(
    (account) =>
      account.watched && account.posts_per_day !== null && account.posts_per_day * 10 > poolLeft,
  );
  const add = (kind: "rss" | "website" | "github", label: string) => (
    <AddButton
      open={adding === kind}
      onClick={() => setAdding(adding === kind ? null : kind)}
      label={label}
    />
  );
  const foldable = (kind: string, count: number) =>
    count > SHOWN ? <ShowMore open={more.isOpen(kind)} onClick={() => more.toggle(kind)} /> : null;

  return (
    <div className="p-2.5">
      <AsideTitle>{monitorContent.aside.title}</AsideTitle>
      {accounts === null || accounts.length ? (
        <section className="mt-1">
          <GroupLabel
            kind="x"
            action={paid && accounts?.length ? <RefreshCounts handle={handle} /> : undefined}
          >
            {groups.x}
          </GroupLabel>
          {accounts === null ? <LoadError /> : null}
          {high.length ? (
            <p className={cn(note, "px-2 pb-1 text-[var(--caution)]")}>
              {copy.accounts.warning(
                high.map((account) => copy.accounts.handle(account.handle)).join(", "),
              )}
            </p>
          ) : null}
          <ul>
            {visibleRows(accounts ?? [], more.isOpen("x"), () => false).map((account) => (
              <AccountRow
                key={account.handle}
                handle={handle}
                account={account}
                open={open === `x:${account.handle}`}
                onToggle={() => toggle(`x:${account.handle}`)}
              />
            ))}
          </ul>
          {foldable("x", accounts?.length ?? 0)}
        </section>
      ) : null}
      {(["rss", "website"] as const).map((kind) => {
        const rows = (sources ?? []).filter((source) => source.kind === kind);
        return (
          <section key={kind} className="mt-3.5">
            <GroupLabel kind={kind} action={add(kind, copy.sources.add)}>
              {groups[kind]}
            </GroupLabel>
            {adding === kind ? <AddSource handle={handle} /> : null}
            {sources === null ? <LoadError /> : null}
            <ul>
              {visibleRows(rows, more.isOpen(kind), (source) => source.note !== null).map(
                (source) => (
                  <SourceRow
                    key={source.id}
                    handle={handle}
                    source={source}
                    open={open === source.id}
                    onToggle={() => toggle(source.id)}
                  />
                ),
              )}
            </ul>
            {foldable(kind, rows.length)}
          </section>
        );
      })}
      <section className="mt-3.5">
        <GroupLabel kind="github" action={add("github", copy.digests.add)}>
          {groups.github}
        </GroupLabel>
        {adding === "github" ? <FollowRepo handle={handle} /> : null}
        {repos === null ? <LoadError /> : null}
        <ul>
          {visibleRows(repos ?? [], more.isOpen("github"), () => false).map((repo) => (
            <RepoRow
              key={`${repo.repo}:${repo.threshold}`}
              handle={handle}
              repo={repo}
              open={open === `gh:${repo.repo}`}
              onToggle={() => toggle(`gh:${repo.repo}`)}
            />
          ))}
        </ul>
        {foldable("github", repos?.length ?? 0)}
      </section>
    </div>
  );
}
