import { CheckIcon, MailIcon, MessageSquareIcon, PencilIcon } from "lucide-react";
import { notFound } from "next/navigation";
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
import { loadSpendWindows } from "@/lib/agent/spend-query";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SourcesCard } from "./sources-card";
import { SpendCard } from "./spend-card";

/**
 * Setup tab (T8). Two-column grid: Sources (left, the only card with real writes — add/
 * remove wired to T3's actions) and, stacked on the right, Connections / Notifications /
 * Spend. Connections' app-level status and Spend's rollup are the other two real data
 * points here; everything else (auto-post, websites, the Connections edit/Send-test
 * controls, the whole Notifications matrix) is grey-scaffolded per the owner rule — reserve
 * the slot, back nothing that has no column yet.
 *
 * Env presence for Connections is resolved HERE, server-side, and passed down as booleans/an
 * address string only — the webhook URL itself never reaches the client.
 */
export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [deskResult, spendWindows] = await Promise.all([
    supabase.from("experiments").select("id, status, tracked_handles").eq("id", id).maybeSingle(),
    loadSpendWindows(supabase),
  ]);

  // RLS scopes ownership, so a foreign id and an absent id are indistinguishable — both a
  // correct 404 (same reasoning as the desk layout's own fetch).
  if (deskResult.error || !deskResult.data) notFound();
  const desk = deskResult.data;

  const slackConnected = Boolean(process.env.SLACK_WEBHOOK_URL);
  const emailAddress = process.env.NOTIFY_EMAIL_TO ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 py-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
      <SourcesCard
        deskId={desk.id}
        deskLive={desk.status === "active"}
        trackedHandles={desk.tracked_handles}
      />
      <div className="flex flex-col gap-6">
        <ConnectionsCard emailAddress={emailAddress} slackConnected={slackConnected} />
        <NotificationsCard />
        <SpendCard windows={spendWindows} />
      </div>
    </div>
  );
}

function SoonBadge() {
  return (
    <Badge className="border-warning/30 bg-warning/10 text-warning" variant="outline">
      Soon
    </Badge>
  );
}

/** Connected/verified status derived from env presence — never a live per-desk connection
 *  check (D5 defers per-desk delivery config). Edit + Send-test are greyed: there is no
 *  backing config to edit yet, only the one app-wide webhook/address. */
function ConnectionsCard({
  slackConnected,
  emailAddress,
}: {
  readonly slackConnected: boolean;
  readonly emailAddress: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Connections</CardTitle>
          <CardDescription>Where drafts &amp; alerts go — app-level, for now.</CardDescription>
        </div>
        <SoonBadge />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <ConnectionRow
          caption={slackConnected ? "Connected" : "Not connected"}
          connected={slackConnected}
          icon={<MessageSquareIcon aria-hidden="true" className="size-4" />}
          label="Slack"
        />
        <ConnectionRow
          caption={emailAddress ? "Verified" : "Not set"}
          connected={emailAddress !== null}
          icon={<MailIcon aria-hidden="true" className="size-4" />}
          label={emailAddress ?? "Email"}
        />
      </CardContent>
    </Card>
  );
}

function ConnectionRow({
  icon,
  label,
  connected,
  caption,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly connected: boolean;
  readonly caption: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-1.5 py-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 truncate text-sm">{label}</span>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-xs",
          connected ? "text-success" : "text-muted-foreground",
        )}
      >
        {connected ? <CheckIcon aria-hidden="true" className="size-3" /> : null}
        {caption}
      </span>
      <Button
        aria-label={`Edit ${label} — per-desk delivery coming soon`}
        className="cursor-not-allowed"
        disabled
        size="icon-sm"
        title="Per-desk delivery coming soon"
        variant="ghost"
      >
        <PencilIcon />
      </Button>
      <Button
        className="cursor-not-allowed"
        disabled
        size="sm"
        title="Per-desk delivery coming soon"
        variant="outline"
      >
        Send test
      </Button>
    </div>
  );
}

type NotificationRow = {
  readonly label: string;
  readonly slack: boolean;
  readonly email: boolean;
  /** "dropdown" renders a greyed frequency `Select` (mock default: Immediately); "always"
   *  renders the mock's static "Always immediate" text — the mock never makes that row a
   *  control, so this stays plain text rather than a disabled dropdown of its own. */
  readonly frequency: "dropdown" | "always";
};

const NOTIFICATION_ROWS: readonly NotificationRow[] = [
  { label: "New draft ready", slack: true, email: true, frequency: "dropdown" },
  { label: "Something breaks", slack: true, email: false, frequency: "always" },
];

/** The full event × Slack/Email matrix — every switch and the frequency dropdown render
 *  disabled. Layout is reserved; nothing here pretends to persist (D5). */
function NotificationsCard() {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Slack &amp; email.</CardDescription>
        </div>
        <SoonBadge />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-3 text-xs font-medium text-muted-foreground">
          <span>Notify me when…</span>
          <span className="text-center">Slack</span>
          <span className="text-center">Email</span>
        </div>
        {NOTIFICATION_ROWS.map((row) => (
          <div
            className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1"
            key={row.label}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm">{row.label}</span>
              {row.frequency === "always" ? (
                <span className="text-xs text-muted-foreground">Always immediate</span>
              ) : (
                <Select disabled value="immediately">
                  <SelectTrigger
                    className="h-6 w-fit cursor-not-allowed gap-1 px-2 text-xs opacity-70"
                    size="sm"
                  >
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
              aria-label={`Notify me in Slack when ${row.label.toLowerCase()} — coming soon`}
              checked={row.slack}
              className="cursor-not-allowed justify-self-center opacity-70"
              disabled
            />
            <Switch
              aria-label={`Notify me by email when ${row.label.toLowerCase()} — coming soon`}
              checked={row.email}
              className="cursor-not-allowed justify-self-center opacity-70"
              disabled
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
