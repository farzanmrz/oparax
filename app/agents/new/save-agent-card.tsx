"use client";

import { type ReactNode, useMemo } from "react";
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import { Spinner } from "@/components/ui/spinner";
import type { DeskAgentUIMessage } from "@/lib/agent/agent";
import { type DeskConfig, deskConfigSchema } from "@/lib/agent/desk-config";
import { formatHandles, formatScanFrequency, TIER_LABELS } from "@/lib/agents";

type SaveAgentPart = Extract<DeskAgentUIMessage["parts"][number], { type: "tool-save_agent" }>;

/**
 * The save_agent approval pause rendered as a Save card. Composes the vendored
 * ai-elements Confirmation kit — that kit owns all state gating (the root is
 * null until an approval exists and the input states have passed; the request /
 * accepted / rejected slots each show themselves for their own state), so this
 * component only supplies content. The desk summary is parsed from the part's
 * own input; Save and "Not yet" are handed up to the chat, which inserts the
 * desk first and then answers the tool approval.
 */
export function SaveAgentCard({
  part,
  saving,
  error,
  onSave,
  onDeny,
}: {
  readonly part: SaveAgentPart;
  readonly saving: boolean;
  readonly error: string | null;
  readonly onSave: (config: DeskConfig) => void;
  readonly onDeny: () => void;
}) {
  // Memoized: the card stays mounted in the transcript while later turns
  // stream, and every streamed token re-renders the message list.
  const config = useMemo(() => {
    const parsed = deskConfigSchema.safeParse(part.input);
    return parsed.success ? parsed.data : null;
  }, [part.input]);

  return (
    <Confirmation approval={part.approval} state={part.state}>
      <ConfirmationRequest>
        <ConfirmationTitle className="block text-base font-semibold">
          Save this desk?
        </ConfirmationTitle>
      </ConfirmationRequest>
      {config ? (
        <dl className="grid gap-2 text-sm">
          <SummaryRow label="Name">{config.name}</SummaryRow>
          <SummaryRow label="Beat">{config.beat}</SummaryRow>
          <SummaryRow label="Handles">{formatHandles(config.handles)}</SummaryRow>
          <SummaryRow label="Account">{TIER_LABELS[config.accountTier]}</SummaryRow>
          <SummaryRow label="Scan frequency">
            {formatScanFrequency(config.scanFrequency)}
          </SummaryRow>
          <SummaryRow label="Drafting">
            <span className="whitespace-pre-wrap">{config.draftingInstructions}</span>
          </SummaryRow>
        </dl>
      ) : null}
      <ConfirmationRequest>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <ConfirmationActions>
          <ConfirmationAction disabled={saving} onClick={onDeny} variant="outline">
            Not yet
          </ConfirmationAction>
          <ConfirmationAction disabled={saving || !config} onClick={() => config && onSave(config)}>
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : (
              "Save desk"
            )}
          </ConfirmationAction>
        </ConfirmationActions>
      </ConfirmationRequest>
      <ConfirmationAccepted>Desk saved.</ConfirmationAccepted>
      <ConfirmationRejected>Not saved — keep tuning below.</ConfirmationRejected>
    </Confirmation>
  );
}

function SummaryRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
