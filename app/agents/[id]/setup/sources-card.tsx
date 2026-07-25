"use client";

// app/agents/[id]/setup/sources-card.tsx
//
// Every client-interactive piece of the Setup tab lives here (T3) — not just the Sources
// card the filename names. T3's owned files are exactly `sources-card.tsx`, `page.tsx`, and
// `actions.ts`: no new component file was in scope for the Connections/Notifications cards'
// interactive controls, so `ConnectionsCard` and `NotificationsCard` are additional named
// exports below rather than siblings — `page.tsx` stays a Server Component (it awaits
// Supabase directly) and can only render a Client Component for anything using hooks, so
// this file is that boundary for the whole tab. See task-22-report.md.
//
// Sources card: tracked X handles, news websites, and the auto-post toggles — all real,
// all wired to T3's actions (`../actions` for handles, `./actions` for
// websites/auto-post/Slack/email). `useTransition` + inline `role="alert"` error + visible
// pending state is the shared pattern every async control below follows, ported from the
// handles add/remove wiring that was already real before this task. Layout per owner
// rework: the master toggle lives on the card-header row, each source-type toggle lives
// right-aligned on its own subsection-header row, and both add-entry areas are the
// chips-in-field pattern (`ChipsField` below). The websites subsection is greyed (opacity
// + "Coming soon" badge, everything disabled) until the Railway ingestion worker deploys
// in Wave 4 — its server actions (`saveWebsites` etc.) stay intact for un-greying.

import { CheckIcon, MailIcon, MessageSquareIcon, XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ChipsField } from "@/components/chips-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MAX_WEBSITES } from "@/lib/websites";
import { MAX_TRACKED_HANDLES } from "@/lib/x/handle";
import { addTrackedHandles, removeTrackedHandle } from "../actions";
import {
  removeWebsite,
  saveWebsites,
  sendTestEmail,
  sendTestSlack,
  toggleAutoPost,
  unlinkSlack,
} from "./actions";

/** Auto-post is BUILT and greyed, not removed. The shipped flow is review-then-post: the
 *  reporter reads the draft in Slack (or the Feed) and clicks Post to X themselves. Flipping
 *  this to `true` re-enables both switches — `toggleAutoPost`, the turn-on confirm gate, and
 *  draft-pipeline.ts's auto-post branch are all still wired behind them. */
const AUTO_POST_ENABLED = false;

type AutoPostTarget = "master" | "x" | "website";

const AUTO_POST_LABEL: Record<AutoPostTarget, string> = {
  master: "auto-post",
  x: "auto-post for X-sourced drafts",
  website: "auto-post for website-sourced drafts",
};

export function SourcesCard({
  deskId,
  trackedHandles,
  websites,
  autoPostMaster,
  autoPostSources,
}: {
  readonly deskId: string;
  readonly trackedHandles: readonly string[];
  readonly websites: readonly string[];
  readonly autoPostMaster: boolean;
  readonly autoPostSources: { readonly x: boolean; readonly website: boolean };
}) {
  const [handleInput, setHandleInput] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isHandlePending, startHandleTransition] = useTransition();

  const [websiteInput, setWebsiteInput] = useState("");
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [isWebsitePending, startWebsiteTransition] = useTransition();

  const [confirmTarget, setConfirmTarget] = useState<AutoPostTarget | null>(null);
  const [autoPostError, setAutoPostError] = useState<string | null>(null);
  const [isAutoPostPending, startAutoPostTransition] = useTransition();

  function handleAddHandle() {
    const raw = handleInput.trim();
    if (!raw) return;
    setHandleError(null);
    startHandleTransition(async () => {
      // Pass the whole blob — the action splits comma/space-separated handles, strips @, and caps.
      const result = await addTrackedHandles(deskId, raw);
      if (!result.ok) {
        setHandleError(result.error);
        return;
      }
      setHandleInput("");
    });
  }

  const atHandleLimit = trackedHandles.length >= MAX_TRACKED_HANDLES;

  function handleRemoveHandle(handle: string) {
    setHandleError(null);
    startHandleTransition(async () => {
      const result = await removeTrackedHandle(deskId, handle);
      if (!result.ok) setHandleError(result.error);
    });
  }

  function handleAddWebsite() {
    const raw = websiteInput.trim();
    if (!raw) return;
    setWebsiteError(null);
    const candidates = raw.split(/[\s,]+/).filter(Boolean);
    startWebsiteTransition(async () => {
      const result = await saveWebsites(deskId, candidates);
      if (!result.ok) {
        setWebsiteError(result.error);
        return;
      }
      setWebsiteInput("");
    });
  }

  const atWebsiteLimit = websites.length >= MAX_WEBSITES;

  function handleRemoveWebsite(url: string) {
    setWebsiteError(null);
    startWebsiteTransition(async () => {
      const result = await removeWebsite(deskId, url);
      if (!result.ok) setWebsiteError(result.error);
    });
  }

  function requestAutoPostChange(target: AutoPostTarget, nextChecked: boolean) {
    setAutoPostError(null);
    if (nextChecked) {
      // Turning ON needs the X-only consequence confirm below — no immediate write.
      setConfirmTarget(target);
      return;
    }
    // Turning OFF needs no confirm.
    runAutoPostChange(target, false);
  }

  function runAutoPostChange(target: AutoPostTarget, checked: boolean) {
    startAutoPostTransition(async () => {
      const result =
        target === "master"
          ? await toggleAutoPost(deskId, { master: checked })
          : await toggleAutoPost(deskId, { source: target, sourceEnabled: checked });
      if (!result.ok) setAutoPostError(result.error);
      setConfirmTarget(null);
    });
  }

  const autoPostDisabled = !AUTO_POST_ENABLED || isAutoPostPending || confirmTarget !== null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Sources</CardTitle>
        {/* Greyed per AUTO_POST_ENABLED — same opacity + "Coming soon" treatment the websites
            subsection below uses, not a special container (AGENTS.md's uniform-fields rule). */}
        <div className="flex items-center gap-2 opacity-50">
          <span className="text-xs text-muted-foreground">Auto-post all</span>
          <Badge variant="secondary">Coming soon</Badge>
          <Switch
            aria-label="Auto-post all sources"
            checked={autoPostMaster}
            disabled={autoPostDisabled}
            onCheckedChange={(checked) => requestAutoPostChange("master", checked)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {confirmTarget ? (
          <div className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5">
            <p className="text-sm text-foreground">
              Turn on {AUTO_POST_LABEL[confirmTarget]}? Oparax will publish matching drafts to X the
              moment they're written, no review — this never applies to LinkedIn or Bluesky drafts,
              which stay draft-only regardless of this setting.
            </p>
            <div className="flex items-center gap-2">
              <Button
                disabled={isAutoPostPending}
                onClick={() => runAutoPostChange(confirmTarget, true)}
                size="sm"
              >
                {isAutoPostPending ? "Turning on…" : "Turn on"}
              </Button>
              <Button
                disabled={isAutoPostPending}
                onClick={() => setConfirmTarget(null)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        {autoPostError ? (
          <p className="text-sm text-destructive" role="alert">
            {autoPostError}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-muted-foreground">
              𝕏 X accounts ({trackedHandles.length}/{MAX_TRACKED_HANDLES})
            </h3>
            <div className="flex items-center gap-2 opacity-50">
              <span className="text-xs text-muted-foreground">Auto-post</span>
              <Badge variant="secondary">Coming soon</Badge>
              <Switch
                aria-label="Auto-post X-sourced drafts"
                checked={autoPostSources.x}
                disabled={autoPostDisabled}
                onCheckedChange={(checked) => requestAutoPostChange("x", checked)}
                size="sm"
              />
            </div>
          </div>
          <ChipsField
            chipClassName="font-mono"
            chipLabel={(handle) => `@${handle}`}
            chips={trackedHandles}
            inputDisabled={isHandlePending || atHandleLimit}
            onChange={setHandleInput}
            onRemove={handleRemoveHandle}
            onSubmit={handleAddHandle}
            placeholder={
              atHandleLimit
                ? `Up to ${MAX_TRACKED_HANDLES} accounts`
                : "Add X accounts — paste comma-separated, @ optional, press Enter"
            }
            removeDisabled={isHandlePending}
            removeLabel={(handle) => `Stop tracking @${handle}`}
            value={handleInput}
          />
          {handleError ? (
            <p className="text-sm text-destructive" role="alert">
              {handleError}
            </p>
          ) : null}
        </div>

        {/* Greyed until the Railway ingestion worker deploys (Wave 4): same markup as the
            X-accounts subsection above, reduced opacity, every interaction disabled. The
            server actions stay wired so un-greying is just dropping the disabled flags. */}
        <div className="flex flex-col gap-2 opacity-50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground">
                News websites ({websites.length}/{MAX_WEBSITES})
              </h3>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Auto-post</span>
              <Switch
                aria-label="Auto-post website-sourced drafts"
                checked={autoPostSources.website}
                disabled
                onCheckedChange={(checked) => requestAutoPostChange("website", checked)}
                size="sm"
              />
            </div>
          </div>
          <ChipsField
            chipLabel={(url) => url}
            chips={websites}
            disabled
            inputDisabled={isWebsitePending || atWebsiteLimit}
            onChange={setWebsiteInput}
            onRemove={handleRemoveWebsite}
            onSubmit={handleAddWebsite}
            placeholder={
              atWebsiteLimit
                ? `Up to ${MAX_WEBSITES} websites`
                : "Track a news website — example.com, press Enter"
            }
            removeDisabled={isWebsitePending}
            removeLabel={(url) => `Stop tracking ${url}`}
            value={websiteInput}
          />
          {websiteError ? (
            <p className="text-sm text-destructive" role="alert">
              {websiteError}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** Connected/unlinked status now derived from the real per-desk Slack link (`getSlackLinkState`,
 *  passed down from `page.tsx`) — never env presence. Email stays the one app-wide
 *  `NOTIFY_EMAIL_TO` address (no per-desk override this slice, see task-22-report.md); its
 *  Send-test is real and fails clean until Resend is provisioned. */
export function ConnectionsCard({
  deskId,
  slack,
  emailAddress,
}: {
  readonly deskId: string;
  readonly slack: { linked: boolean; teamName: string | null; channelName: string | null };
  readonly emailAddress: string | null;
}) {
  const pathname = usePathname();
  const [slackError, setSlackError] = useState<string | null>(null);
  const [slackSent, setSlackSent] = useState(false);
  const [isSlackPending, startSlackTransition] = useTransition();

  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isEmailPending, startEmailTransition] = useTransition();

  function handleSendTestSlack() {
    setSlackError(null);
    setSlackSent(false);
    startSlackTransition(async () => {
      const result = await sendTestSlack(deskId);
      if (!result.ok) {
        setSlackError(result.error);
        return;
      }
      setSlackSent(true);
    });
  }

  function handleDisconnectSlack() {
    setSlackError(null);
    setSlackSent(false);
    startSlackTransition(async () => {
      const result = await unlinkSlack(deskId);
      if (!result.ok) setSlackError(result.error);
    });
  }

  function handleSendTestEmail() {
    setEmailError(null);
    setEmailSent(false);
    startEmailTransition(async () => {
      const result = await sendTestEmail(deskId);
      if (!result.ok) {
        setEmailError(result.error);
        return;
      }
      setEmailSent(true);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>Connections</CardTitle>
        <CardDescription>Where drafts &amp; alerts go.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-lg px-1.5 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <MessageSquareIcon aria-hidden="true" className="size-4" />
            </span>
            <div className="flex flex-1 flex-col truncate">
              <span className="truncate text-sm">Slack</span>
              {slack.linked ? (
                <span className="flex items-center gap-1 truncate text-xs text-success">
                  <CheckIcon aria-hidden="true" className="size-3" />
                  {slack.teamName ? `${slack.teamName} · ` : ""}
                  {slack.channelName ? `#${slack.channelName}` : "Connected"}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Not connected</span>
              )}
            </div>
            {slack.linked ? (
              <>
                <Button
                  disabled={isSlackPending}
                  onClick={handleSendTestSlack}
                  size="sm"
                  variant="outline"
                >
                  {isSlackPending ? "Sending…" : "Send test"}
                </Button>
                <Button
                  aria-label="Disconnect Slack"
                  disabled={isSlackPending}
                  onClick={handleDisconnectSlack}
                  size="icon-sm"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </>
            ) : (
              <Button asChild size="sm" variant="outline">
                {/* Plain link, not a fetch: /auth/slack/link is a full-page OAuth redirect to
                    Slack (that route is a separate task). returnTo brings the reporter back
                    here; experimentId tells the callback which desk's slack_accounts row to
                    write — mirrors PostToXControl's /auth/x?returnTo= pattern exactly. */}
                <a
                  href={`/auth/slack/link?returnTo=${encodeURIComponent(pathname)}&experimentId=${encodeURIComponent(deskId)}`}
                >
                  Connect Slack
                </a>
              </Button>
            )}
          </div>
          {slackError ? (
            <p className="px-1.5 text-sm text-destructive" role="alert">
              {slackError}
            </p>
          ) : slackSent ? (
            <p className="px-1.5 text-xs text-muted-foreground">Test message sent.</p>
          ) : null}
        </div>

        {/* Email delivery is greyed: the shipped flow notifies on Slack only. The senders,
            the reply-to encoding, and the inbound-reply webhook all stay wired behind
            draft-pipeline.ts's EMAIL_DELIVERY_ENABLED — dormant, not deleted. */}
        <div className="flex flex-col gap-2 opacity-50">
          <div className="flex items-center gap-3 rounded-lg px-1.5 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <MailIcon aria-hidden="true" className="size-4" />
            </span>
            <div className="flex flex-1 flex-col truncate">
              <span className="truncate text-sm">{emailAddress ?? "Email"}</span>
              <span className="text-xs text-muted-foreground">
                {emailAddress ? "App-wide address" : "Not set"}
              </span>
            </div>
            <Badge variant="secondary">Coming soon</Badge>
            <Button disabled onClick={handleSendTestEmail} size="sm" variant="outline">
              {isEmailPending ? "Sending…" : "Send test"}
            </Button>
          </div>
          {emailError ? (
            <p className="px-1.5 text-sm text-destructive" role="alert">
              {emailError}
            </p>
          ) : emailSent ? (
            <p className="px-1.5 text-xs text-muted-foreground">Test email sent.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

type NotificationRow = {
  readonly key: string;
  readonly label: string;
  readonly defaultSlack: boolean;
  readonly defaultEmail: boolean;
  /** "dropdown" renders a real frequency `Select` (default: Immediately); "always" renders
   *  static "Always immediate" text — that row never becomes a dropdown, matching the mock. */
  readonly frequency: "dropdown" | "always";
};

const NOTIFICATION_ROWS: readonly NotificationRow[] = [
  {
    key: "new-draft",
    label: "New draft ready",
    defaultSlack: true,
    defaultEmail: true,
    frequency: "dropdown",
  },
  {
    key: "something-breaks",
    label: "Something breaks",
    defaultSlack: true,
    defaultEmail: false,
    frequency: "always",
  },
];

/**
 * The event × Slack/Email matrix — every switch and the frequency dropdown are real and
 * toggleable (local component state via `useTransition`-free `useState`: there's no
 * `experiments` column or table reserved for notification preferences this slice, so there's
 * nothing to call a server action against yet). Clicking genuinely changes what's shown;
 * it just doesn't survive a reload — see task-22-report.md for why no fake persistence call
 * was wired instead of leaving this note.
 */
export function NotificationsCard() {
  const [prefs, setPrefs] = useState<
    Record<string, { slack: boolean; email: boolean; frequency: string }>
  >(() =>
    Object.fromEntries(
      NOTIFICATION_ROWS.map((row) => [
        row.key,
        { slack: row.defaultSlack, email: row.defaultEmail, frequency: "immediately" },
      ]),
    ),
  );

  function setPref(
    key: string,
    patch: Partial<{ slack: boolean; email: boolean; frequency: string }>,
  ) {
    setPrefs((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CardTitle>Notifications</CardTitle>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
        <CardDescription>
          Every new draft goes to Slack. Per-event routing and frequency aren't wired yet.
        </CardDescription>
      </CardHeader>
      {/* Greyed whole: these switches were always local state with no column behind them, so
          they promised routing the app doesn't do. Slack-on-every-draft is the real behavior. */}
      <CardContent className="flex flex-col gap-3 opacity-50">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-3 text-xs font-medium text-muted-foreground">
          <span>Notify me when…</span>
          <span className="text-center">Slack</span>
          <span className="text-center">Email</span>
        </div>
        {NOTIFICATION_ROWS.map((row) => {
          const pref = prefs[row.key];
          return (
            <div
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1"
              key={row.key}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm">{row.label}</span>
                {row.frequency === "always" ? (
                  <span className="text-xs text-muted-foreground">Always immediate</span>
                ) : (
                  <Select
                    disabled
                    onValueChange={(value) => setPref(row.key, { frequency: value })}
                    value={pref.frequency}
                  >
                    <SelectTrigger className="h-6 w-fit gap-1 px-2 text-xs" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediately">Immediately</SelectItem>
                      <SelectItem value="hourly">Hourly digest</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Switch
                aria-label={`Notify me in Slack when ${row.label.toLowerCase()}`}
                checked={pref.slack}
                className="justify-self-center"
                disabled
                onCheckedChange={(checked) => setPref(row.key, { slack: checked })}
              />
              <Switch
                aria-label={`Notify me by email when ${row.label.toLowerCase()}`}
                checked={pref.email}
                className="justify-self-center"
                disabled
                onCheckedChange={(checked) => setPref(row.key, { email: checked })}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
