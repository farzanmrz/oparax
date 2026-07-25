// lib/voice/rules.ts
//
// voice_rules CRUD + the pure flattening function that replaces the raw guide's role in the
// drafting system prompt. `voice_rules` is keyed by `experiment_id` — a rule belongs to ONE
// desk, mirroring `voice_guides`. (It was previously keyed by `reporter_handle` and shared
// across every desk on that reporter; that sharing model is deleted.) Its RLS is an
// EXISTS-join through `experiments` on the desk's own id, select-only. No insert/update/delete
// policy exists, so every write in this module runs on the admin (service-role) client (mirrors
// create-desk-extraction.ts). Callers prove desk ownership via the RLS client before calling in
// — the same ownership-then-service-role-write pattern as lib/x/actions.ts's postDraftToX —
// this module does no ownership check of its own.
//
// Server-only: admin client only, no "use client". Unlike attemptVoiceExtraction (intentionally
// best-effort), CRUD failures here surface to their callers — throw on real DB errors.
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type VoiceRuleRow = Database["public"]["Tables"]["voice_rules"]["Row"];

export type VoiceRule = {
  id: string;
  experimentId: string;
  rule: string;
  sortOrder: number;
  enabled: boolean;
  provenanceModelCallId: string | null;
  createdAt: string;
  updatedAt: string;
};

function toVoiceRule(row: VoiceRuleRow): VoiceRule {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    rule: row.rule,
    sortOrder: row.sort_order,
    enabled: row.enabled,
    provenanceModelCallId: row.provenance_model_call_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** One desk's rules, ordered by sortOrder asc then createdAt asc as a stable tiebreak for
 *  rows sharing a sortOrder (e.g. a fresh materializeRulesFromGuide batch inserted at once). */
export async function listVoiceRules(experimentId: string): Promise<VoiceRule[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("voice_rules")
    .select("*")
    .eq("experiment_id", experimentId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toVoiceRule);
}

async function nextSortOrder(admin: AdminClient, experimentId: string): Promise<number> {
  const { data, error } = await admin
    .from("voice_rules")
    .select("sort_order")
    .eq("experiment_id", experimentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.sort_order + 1 : 0;
}

export async function createVoiceRule(input: {
  experimentId: string;
  rule: string;
  provenanceModelCallId?: string | null;
}): Promise<VoiceRule> {
  const admin = createAdminClient();
  const sortOrder = await nextSortOrder(admin, input.experimentId);
  const { data, error } = await admin
    .from("voice_rules")
    .insert({
      experiment_id: input.experimentId,
      rule: input.rule,
      sort_order: sortOrder,
      provenance_model_call_id: input.provenanceModelCallId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toVoiceRule(data);
}

export async function updateVoiceRule(
  id: string,
  patch: Partial<{ rule: string; enabled: boolean; sortOrder: number }>,
): Promise<void> {
  const admin = createAdminClient();
  const update: Database["public"]["Tables"]["voice_rules"]["Update"] = {};
  if (patch.rule !== undefined) update.rule = patch.rule;
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
  const { error } = await admin.from("voice_rules").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteVoiceRule(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("voice_rules").delete().eq("id", id);
  if (error) throw error;
}

/** THE drafting input of record (plan text, T2.6): replaces the raw guide's role in the system
 *  prompt. Pure — no I/O. Filters to `enabled` rules and sorts by sortOrder itself (rather than
 *  trusting the caller's array order), so the same input always flattens to the same prose
 *  regardless of how it was fetched. Returns "" for an empty enabled set — callers decide what
 *  that means for the prompt they compose. Does NOT read `measuredFacts` or call `deployGuide`
 *  — composing `flattenRulesToPrompt(enabledRules) + measuredFacts` into the actual system
 *  prompt is T2.3 / the drafting call sites' job. */
export function flattenRulesToPrompt(rules: VoiceRule[]): string {
  const ordered = rules
    .filter((r) => r.enabled)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (ordered.length === 0) return "";
  const lines = ordered.map((r) => `- ${r.rule.trim()}`);
  return [
    "Voice rules — follow every rule below when drafting this reporter's post.",
    ...lines,
  ].join("\n");
}

/** The drafting call sites' composition step `flattenRulesToPrompt`'s own docstring named as
 *  "T2.3 / the drafting call sites' job" — done here instead of duplicated at every call site.
 *  Falls back to the raw deployed guide when no rule is enabled (rules not yet materialized
 *  for this reporter, or every rule disabled): an empty voice-rules block would leave drafting
 *  with no style guidance at all, worse than the guide-only behavior it replaces. */
export function resolveDraftingPrompt(
  rules: VoiceRule[],
  measuredFacts: string,
  guideDeploy: string,
): string {
  const flattened = flattenRulesToPrompt(rules);
  return flattened ? `${flattened}\n\n${measuredFacts}` : guideDeploy;
}

/** Splits a deployed guide into its `## ` (level-2) sections, each kept whole (heading + body)
 *  as one candidate rule. Drops the bare `# Voice Guide: @handle` title preamble that precedes
 *  the first `## ` heading — it carries no instructional content of its own. Falls back to the
 *  whole trimmed guide as a single section when no `## ` heading is found at all. See
 *  materializeRulesFromGuide's docstring for why this split point was chosen. */
function splitGuideIntoSections(guideDeploy: string): string[] {
  const trimmed = guideDeploy.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/\n(?=##\s)/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const sections = parts.filter((part) => part.startsWith("##"));
  return sections.length > 0 ? sections : [trimmed];
}

/**
 * Turns a freshly extracted, deployed voice guide into an initial set of `voice_rules` rows —
 * a starting point the reporter edits down (or up) in the Voice UI, not a perfect extraction.
 *
 * Splitting heuristic: one rule per `## ` (level-2) section of the deployed guide (heading +
 * its full body kept together), via `splitGuideIntoSections`. This survives every section shape
 * seen across `.voice-lab/guides/*.md` (Identity & Register, Hard Rules — Always/Never,
 * Formatting, Vocabulary & Phrasing, Situation Templates, Long-form Mode, Representative Posts)
 * without hardcoding any of those section names — so it keeps working if the extraction
 * prompt's section list ever changes — and it never fragments a section's bullets, nested
 * example blockquotes, or sub-headings into separate rows, which a bullet-line split would.
 * Falls back to a single rule wrapping the whole deployed guide when no `## ` heading is found.
 *
 * NOT called from this file — T2.3 (`lib/voice/create-desk-extraction.ts`) calls in once a
 * fresh guide has been extracted and deployed.
 */
export async function materializeRulesFromGuide(
  experimentId: string,
  guideDeploy: string,
  provenanceModelCallId: string,
): Promise<VoiceRule[]> {
  const sections = splitGuideIntoSections(guideDeploy);
  if (sections.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("voice_rules")
    .insert(
      sections.map((rule, index) => ({
        experiment_id: experimentId,
        rule,
        sort_order: index,
        provenance_model_call_id: provenanceModelCallId,
      })),
    )
    .select("*");
  if (error) throw error;
  return (data ?? []).map(toVoiceRule);
}
