"use client";

import { Check, X as CloseIcon, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, startTransition, useActionState, useId, useState } from "react";
import { hue } from "@/components/one/app-shell";
import { BandCard, bandButton } from "@/components/one/band-card";
import { GroupGlyph, SourceMark } from "@/components/one/marks";
import { titleCase } from "@/components/one/stage";
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
import type { FollowedRepo, SettingsAccount, SettingsSource } from "@/lib/settings/read";
import { cn } from "@/lib/utils";

// The Sources page (owner, Oct 10: "Sources look fine", locked; lab v2/one/settings.tsx): one band card per kind,
// side by side across the page's column: the kind mark, the kind name in Title Case and Add in the band; rows under
// it, each the logo, the name and the handle or address on one line with a cross at the right end that removes it at
// once, no dialog (owner, Oct 10: "when the cross is pressed, no dialog box needs to open up... They can add it simply
// again"). A row opens its reason and its own controls under it. Every change goes through the existing settings
// actions; adding and removing need only the sign-up. A Twitter account has no remove in the product, so its row
// carries Watch instead; the kinds that can be added to keep their card while empty, so Add has a home.

const groups = monitorContent.onboarding.groups;
const number = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const note = "text-[12.5px] leading-[1.5]";
const field =
  "h-8 w-full min-w-0 rounded-md border border-line-strong bg-[var(--well)] px-2.5 text-[13px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] disabled:opacity-60 aria-invalid:border-[var(--error)]";
const quietButton =
  "inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12px] text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

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

/** One line: the mark, the name and address, the row's control at the right; its detail opens under it. */
function Row({
  mark,
  name,
  address,
  noteLine,
  control,
  detail,
  open,
  onToggle,
  dim,
}: {
  mark: ReactNode;
  name: string;
  address: string;
  noteLine?: string | null;
  control: ReactNode;
  detail: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** The row is being removed. */
  dim?: boolean;
}) {
  return (
    <li
      className={cn(
        "rounded-md transition-colors",
        open ? "bg-[var(--raised)]" : "hover:bg-raised/60",
        dim && "opacity-50",
      )}
    >
      <div className="flex min-h-9 items-center gap-1 pr-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-9 min-w-0 flex-1 items-center gap-3 rounded-md px-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
        >
          {mark}
          <span className="min-w-0 flex-1 truncate">
            <span className="text-[13.5px] font-medium text-t1">{name}</span>
            {address !== name ? (
              <span className="ml-2 text-[12.5px] text-t3">{address}</span>
            ) : null}
          </span>
        </button>
        {control}
      </div>
      {noteLine ? (
        <p className={cn(note, "-mt-1 pr-4 pb-1.5 pl-[42px] text-[var(--error)]")}>{noteLine}</p>
      ) : null}
      {open ? (
        <div className="grid gap-2 pr-4 pb-3 pl-[42px] text-[13px] leading-[1.5]">{detail}</div>
      ) : null}
    </li>
  );
}

/** The quiet cross at the right of a row: removes at once. */
function RemoveX({
  label,
  pending,
  onClick,
}: {
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={label}
      className="grid size-7 shrink-0 place-items-center rounded-md text-t4 transition-colors hover:bg-raised hover:text-[var(--error)] focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
    >
      <CloseIcon className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function LoadError() {
  return <p className={cn(note, "px-2 py-1.5 text-[var(--error)]")}>{copy.loadError}</p>;
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
          className={cn(bandButton, account.watched && "border-[var(--brand-line)] text-t1")}
        >
          {account.watched ? (
            <Check className="size-3 text-[var(--brand)]" strokeWidth={2.5} aria-hidden="true" />
          ) : null}
          {account.watched ? monitorContent.watched : copy.accounts.watch}
        </button>
      }
      detail={
        <>
          {account.why ? <p className="text-t2">{account.why}</p> : null}
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
  const [removeState, remove, removing] = useActionState<SettingsResult | null, void>(
    () => removeSource(handle, source.id),
    null,
  );
  const [filterState, changeFilter, filterPending] = useActionState<SettingsResult | null, boolean>(
    (_previous, on) => setNoFilter(handle, source.id, on),
    null,
  );
  return (
    <Row
      mark={<SourceMark kind="site" mark={source.host} size={18} className="rounded-[4px]" />}
      name={source.name}
      address={source.host}
      noteLine={source.note ?? (removeState && !removeState.ok ? removeState.error : null)}
      open={open}
      onToggle={onToggle}
      dim={removing}
      control={
        <RemoveX
          label={copy.sources.removeLabel(source.name)}
          pending={removing}
          onClick={() => startTransition(() => remove())}
        />
      }
      detail={
        <>
          {source.focus ? <p className="text-t1">{source.focus}</p> : null}
          {source.why ? <p className="text-t2">{source.why}</p> : null}
          <div className="flex items-center gap-2.5 pt-0.5">
            <Switch
              id={id}
              checked={source.noFilter}
              disabled={filterPending}
              aria-label={copy.sources.filterLabel(source.name)}
              onCheckedChange={(on) => startTransition(() => changeFilter(on))}
            />
            <label htmlFor={id} className="cursor-pointer text-[12.5px] text-t2">
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
  const [threshold, setThreshold] = useState(String(repo.threshold));
  const [removeState, remove, removing] = useActionState<SettingsResult | null, void>(
    () => unfollowRepo(handle, repo.repo),
    null,
  );
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    (_previous, data) => followRepo(handle, repo.repo, Number(data.get("threshold"))),
    null,
  );
  return (
    <Row
      mark={<SourceMark kind="github" mark={repo.repo} size={18} />}
      name={repo.repo}
      address={repo.repo}
      noteLine={removeState && !removeState.ok ? removeState.error : null}
      open={open}
      onToggle={onToggle}
      dim={removing}
      control={
        <RemoveX
          label={copy.digests.removeLabel(repo.repo)}
          pending={removing}
          onClick={() => startTransition(() => remove())}
        />
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
                className={cn(field, "max-w-[160px] tabular-nums")}
              />
              <button type="submit" disabled={pending} className={cn(bandButton, "h-8")}>
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
function AddSource({ handle, onAdded }: { handle: string; onAdded: () => void }) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    async (_previous, data) => {
      const result = await addSource(handle, String(data.get("url") ?? ""));
      if (result.ok) {
        setUrl("");
        onAdded();
      }
      return result;
    },
    null,
  );
  return (
    <form action={action} className="grid gap-1.5 px-2 pt-1 pb-3" aria-busy={pending}>
      <label htmlFor={id} className="text-[12px] text-t2">
        {copy.sources.url}
      </label>
      <div className="flex gap-2">
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
        <button type="submit" disabled={pending} className={cn(bandButton, "h-8")}>
          {pending ? copy.sources.adding : copy.sources.add}
        </button>
      </div>
      <div aria-live="polite">
        <Result state={state} done={copy.sources.added} />
      </div>
    </form>
  );
}

/** The existing follow flow for a GitHub repository and its star threshold. */
function FollowRepo({ handle, onAdded }: { handle: string; onAdded: () => void }) {
  const [repo, setRepo] = useState("");
  const [threshold, setThreshold] = useState(String(copy.digests.defaultThreshold));
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    async (_previous, data) => {
      const result = await followRepo(
        handle,
        String(data.get("repo") ?? ""),
        Number(data.get("threshold")),
      );
      if (result.ok) {
        setRepo("");
        onAdded();
      }
      return result;
    },
    null,
  );
  return (
    <form action={action} className="grid gap-1.5 px-2 pt-1 pb-3" aria-busy={pending}>
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
      <button type="submit" disabled={pending} className={cn(bandButton, "h-8 justify-self-start")}>
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
      className={bandButton}
    >
      <Plus className="size-3.5" aria-hidden="true" />
      {monitorContent.aside.add}
    </button>
  );
}

export function SourcesPage({
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
  const glyph = (kind: "x" | "rss" | "website" | "github") => (
    <GroupGlyph kind={kind} className={cn("size-4 shrink-0", hue[kind])} />
  );
  const none = <p className={cn(note, "px-2 py-1.5 text-t3")}>{copy.none}</p>;

  return (
    <div className="mt-6 grid items-start gap-4 desk:grid-cols-2 xl:grid-cols-4">
      {accounts === null || accounts.length ? (
        <BandCard
          glyph={glyph("x")}
          heading={titleCase(groups.x)}
          action={paid && accounts?.length ? <RefreshCounts handle={handle} /> : undefined}
          bodyClassName="px-2 py-2"
        >
          {accounts === null ? <LoadError /> : null}
          <ul>
            {(accounts ?? []).map((account) => (
              <AccountRow
                key={account.handle}
                handle={handle}
                account={account}
                open={open === `x:${account.handle}`}
                onToggle={() => toggle(`x:${account.handle}`)}
              />
            ))}
          </ul>
          {high.length ? (
            <p className={cn(note, "px-2 pt-2 pb-1 text-[var(--caution)]")}>
              {copy.accounts.warning(
                high.map((account) => copy.accounts.handle(account.handle)).join(", "),
              )}
            </p>
          ) : null}
        </BandCard>
      ) : null}
      {(["rss", "website"] as const).map((kind) => {
        const rows = (sources ?? []).filter((source) => source.kind === kind);
        return (
          <BandCard
            key={kind}
            glyph={glyph(kind)}
            heading={titleCase(groups[kind])}
            action={add(kind, copy.sources.add)}
            bodyClassName="px-2 py-2"
          >
            {adding === kind ? <AddSource handle={handle} onAdded={() => setAdding(null)} /> : null}
            {sources === null ? <LoadError /> : null}
            {sources !== null && !rows.length && adding !== kind ? none : null}
            <ul>
              {rows.map((source) => (
                <SourceRow
                  key={source.id}
                  handle={handle}
                  source={source}
                  open={open === source.id}
                  onToggle={() => toggle(source.id)}
                />
              ))}
            </ul>
          </BandCard>
        );
      })}
      <BandCard
        glyph={glyph("github")}
        heading={titleCase(groups.github)}
        action={add("github", copy.digests.add)}
        bodyClassName="px-2 py-2"
      >
        {adding === "github" ? (
          <FollowRepo handle={handle} onAdded={() => setAdding(null)} />
        ) : null}
        {repos === null ? <LoadError /> : null}
        {repos !== null && !repos.length && adding !== "github" ? none : null}
        <ul>
          {(repos ?? []).map((repo) => (
            <RepoRow
              key={repo.repo}
              handle={handle}
              repo={repo}
              open={open === `gh:${repo.repo}`}
              onToggle={() => toggle(`gh:${repo.repo}`)}
            />
          ))}
        </ul>
      </BandCard>
    </div>
  );
}
