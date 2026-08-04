"use client";

import { useState } from "react";
import { CheckCircle2Icon, ChevronDownIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Platform } from "@/lib/agent/desk-config";
import type { FeedItem } from "@/lib/agent/feed-query";
import { cn } from "@/lib/utils";
import type { ExtractionProgressState } from "@/lib/voice/use-extraction-progress";
import { DraftPlatformSwitcher } from "./draft-platform-switcher";
import { ExpandableBody } from "./expandable-body";
import { FeedSetupProgress } from "./feed-setup-progress";
import { ExtraSourcesBadge } from "./feed-tooltips";
import { PostCard } from "./post-card";
import { RelativeTime } from "./relative-time";
import { SourceChip, SourceTweetView } from "./source-view";
import styles from "./source-tweet.module.css";
import { XAvatar } from "./x-avatar";

function defaultPlatform(winners: FeedItem["winners"]): Platform { return winners.x ? "x" : Object.keys(winners)[0] as Platform; }
function status(item: FeedItem) { const x = item.winners.x; if (!Object.keys(item.winners).length) return Date.now() - new Date(item.createdAt).getTime() <= 10 * 60 * 1000 ? "Drafting…" : "No draft"; return x?.postedAt && x.postedUrl ? "Posted" : x?.postedAt ? "Unconfirmed" : "Ready to review"; }

export function FeedItemCard({ item, agentId, reporterHandle: _reporterHandle, xHandle: _xHandle, charLimit, xLinked }: { item: FeedItem; agentId: string; reporterHandle: string; xHandle: string | null; charLimit: number; xLinked: boolean }) {
  const platforms = Object.keys(item.winners) as Platform[]; const [selected, setSelected] = useState<Platform>(() => defaultPlatform(item.winners)); const activePlatform = platforms.includes(selected) ? selected : defaultPlatform(item.winners); const active = item.winners[activePlatform] ?? null;
  const confirmed = item.winners.x?.postedAt != null && item.winners.x?.postedUrl != null;
  const drafting = !active && status(item) === "Drafting…";
  return <div className={cn(confirmed && "opacity-[0.66]")}><PostCard>
    <Collapsible>
      <CollapsibleTrigger asChild><button className={cn(styles.header, "min-h-11 w-full text-left")} type="button">
        {item.source.avatarUrl ? <img alt="" className={styles.avatar} src={item.source.avatarUrl} /> : item.source.authorHandle ? <XAvatar handle={item.source.authorHandle} /> : <span aria-hidden="true" className={styles.monogram}>◎</span>}
        <span className={styles.handle}>{item.source.authorHandle ? `@${item.source.authorHandle}` : item.source.siteName}</span>{item.extraSourceCount > 0 ? <ExtraSourcesBadge count={item.extraSourceCount} /> : null}
        {item.source.gone ? <TriangleAlertIcon aria-label="No longer on X · archived" className="size-3.5" /> : null}<span className={styles.spacer} /><Badge variant="secondary">{status(item)}</Badge>{item.source.postedAt ? <span className={styles.time}><RelativeTime iso={item.source.postedAt} prefix="Posted" /></span> : null}<SourceChip kind={item.source.kind} /><ChevronDownIcon className="size-4" />
      </button></CollapsibleTrigger>
      <CollapsibleContent className="pt-3"><SourceTweetView source={item.source} translation={active?.translation ?? null} /></CollapsibleContent>
    </Collapsible>
    <h2 className="text-base font-semibold">{item.headline}</h2>
    {active?.synthesis ? <ExpandableBody>{active.synthesis}</ExpandableBody> : null}
    {active ? <DraftPlatformSwitcher activePlatform={activePlatform} agentId={agentId} charLimit={charLimit} onPlatformChange={setSelected} sourcePostId={item.source.id} winners={item.winners} xLinked={xLinked} /> : drafting ? <div className="flex items-center gap-2" role="status"><span className="size-1.5 animate-pulse rounded-full bg-primary" /><span className="text-sm text-muted-foreground">Drafting in your voice — a few models are writing…</span></div> : <p className="text-sm text-muted-foreground">Nothing drafted from this post — there wasn&apos;t enough to write from.</p>}
    {active ? <div className="text-xs text-muted-foreground"><RelativeTime iso={active.createdAt} prefix="Drafted" /></div> : null}
  </PostCard></div>;
}

export type FeedReadiness = { kind: "paused" } | { kind: "no_sources" } | { kind: "extraction_running"; initial: ExtractionProgressState } | { kind: "extraction_failed"; initial: ExtractionProgressState } | { kind: "extraction_missing" } | { kind: "ready" };
const EMPTY: Record<Exclude<FeedReadiness["kind"], "extraction_running" | "extraction_failed">, { title: string; body: string; actionLabel?: string; actionHref?: string }> = { ready: { title: "Your voice is ready", body: "You can review it in Voice. New stories and drafts will appear here as soon as your agent finds something on-beat." }, paused: { title: "Your agent is paused", body: "It won't create new drafts until you resume it from the agent controls." }, no_sources: { title: "Add a source to get drafts", body: "Your agent needs at least one tracked X account before it can watch for on-beat posts.", actionLabel: "Add sources", actionHref: "/setup" }, extraction_missing: { title: "Finish setting up your agent", body: "Your agent still needs to learn your voice before it can create drafts.", actionLabel: "Go to Voice", actionHref: "/voice" } };
export function FeedEmptyState({ deskId, readiness }: { deskId: string; readonly readiness: FeedReadiness }) { if (readiness.kind === "extraction_running" || readiness.kind === "extraction_failed") return <FeedSetupProgress deskId={deskId} initial={readiness.initial} />; const content = EMPTY[readiness.kind]; if (readiness.kind === "ready") return <Alert className="border-primary/30 bg-primary/8 text-foreground" role="status"><CheckCircle2Icon aria-hidden="true" /><AlertTitle>{content.title}</AlertTitle><AlertDescription className="text-foreground/90">{content.body}</AlertDescription></Alert>; return <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-14 text-center"><h3 className="text-sm font-semibold">{content.title}</h3><p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">{content.body}</p>{content.actionHref ? <Button asChild className="min-h-11" size="sm"><Link href={`/agents/${deskId}${content.actionHref}`}>{content.actionLabel}</Link></Button> : null}</div>; }
