// lib/voice/rules.ts
//
// voice_rules CRUD + the pure flattening function that replaces the raw guide's role in the
// drafting system prompt. `voice_rules` is keyed by `agent_id` — a rule belongs to ONE
// desk, mirroring `voice_guides`. (It was previously keyed by `reporter_handle` and shared
// across every desk on that reporter; that sharing model is deleted.) Its RLS is an
// EXISTS-join through `agents` on the desk's own id, select-only. No insert/update/delete
// policy exists, so every write in this module runs on the admin (service-role) client (mirrors
// create-desk-extraction.ts). Callers prove desk ownership via the RLS client before calling in
// — the same ownership-then-service-role-write pattern as lib/x/actions.ts's postDraftToX —
// this module does no ownership check of its own.
//
// Server-only: admin client only, no "use client". Unlike the extraction phase (intentionally
// best-effort), CRUD failures here surface to their callers — throw on real DB errors.
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { BEAT_SCOPE_HEADING_RE, stripBeatScope } from "./deploy-guide";

type AdminClient = ReturnType<typeof createAdminClient>;
type VoiceRuleRow = Database["public"]["Tables"]["voice_rules"]["Row"];

export type VoiceRule = {
  id: string;
  agentId: string;
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
    agentId: row.agent_id,
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
export async function listVoiceRules(agentId: string): Promise<VoiceRule[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("voice_rules")
    .select("*")
    .eq("agent_id", agentId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toVoiceRule);
}

async function nextSortOrder(
  admin: AdminClient,
  agentId: string,
  opts?: { reporterOnly?: boolean },
): Promise<number> {
  const base = admin.from("voice_rules").select("sort_order").eq("agent_id", agentId);
  const query = opts?.reporterOnly ? base.is("provenance_model_call_id", null) : base;
  const { data, error } = await query
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.sort_order + 1 : 0;
}

export async function createVoiceRule(input: {
  agentId: string;
  rule: string;
  provenanceModelCallId?: string | null;
}): Promise<VoiceRule> {
  const admin = createAdminClient();
  const sortOrder = await nextSortOrder(admin, input.agentId);
  const { data, error } = await admin
    .from("voice_rules")
    .insert({
      agent_id: input.agentId,
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
 *  prompt is T2.3 / the drafting call sites' job.
 *
 *  The `BEAT_SCOPE_HEADING_RE` filter below is now a SAFETY NET, not the primary mechanism
 *  (#73): `materializeRulesFromGuide` receives `guideDeploy` already stripped of `## Beat &
 *  Scope` by `deployGuide()`, so no fresh extraction can insert a Beat & Scope row at all — the
 *  real beat-filtration spec is read from `voice_guides.guide_raw` via `extractBeatSpec()` and
 *  routed to the drafter as its own `beatSpec` input. This filter defends desks whose Beat &
 *  Scope row was materialized before that fix landed, until the cleanup migration
 *  (`20260727170004_delete_machine_beat_scope_rules.sql`) removes those rows; it stays cheap
 *  enough to leave in place afterward regardless. */
function flattenRulesToPrompt(rules: VoiceRule[]): string {
  const ordered = rules
    .filter((r) => r.enabled && !BEAT_SCOPE_HEADING_RE.test(r.rule.trim()))
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
  return flattened ? `${flattened}\n\n${measuredFacts}` : stripBeatScope(guideDeploy);
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
 * REPLACES the previous machine-generated set rather than adding to it: a second extraction for
 * the same desk used to leave both sets in place, so the drafting prompt carried the old and new
 * instructions together at twice the token cost. The clear is scoped to rows carrying a
 * `provenance_model_call_id` — those are the ones a model wrote, and a fresh guide supersedes
 * them. Rules the REPORTER typed have a null `provenance_model_call_id` and MUST survive: a
 * retry that destroyed a reporter's own edits would be far worse than the duplication it fixes.
 *
 * NOT called from this file — T2.3 (`lib/voice/create-desk-extraction.ts`) calls in once a
 * fresh guide has been extracted and deployed.
 */
export async function materializeRulesFromGuide(
  agentId: string,
  guideDeploy: string,
  provenanceModelCallId: string,
): Promise<VoiceRule[]> {
  const sections = splitGuideIntoSections(guideDeploy);
  if (sections.length === 0) return [];
  const admin = createAdminClient();

  // Reporter-authored rules (provenance_model_call_id IS NULL) are untouched by the clear below
  // and keep their own sort_order — but a fresh machine set always starting at 0 can collide
  // with whatever sort_order those rows already hold, producing duplicate sort_order values and
  // unstable interleaving in the Voice UI. Offset the new machine rules past the current max
  // reporter sort_order so the two sets never overlap; reporter rows' rule text and
  // provenance_model_call_id are never touched here, only where machine rules start numbering.
  // Guarantees only: no sort_order collision between the fresh machine set and existing
  // reporter-authored rows (the original bug this offset was written to fix). Does NOT
  // guarantee stable relative ordering across a re-extraction — if a reporter adds a custom
  // rule (via createVoiceRule) after an existing machine set, its sort_order sits above every
  // machine rule; a later re-extraction then offsets the new machine set past that custom
  // rule's sort_order too, pushing the custom rule ahead of the fresh machine set even though
  // the reporter originally placed it after the OLD one. Fixing that requires deciding what
  // "stable relative order" means when reporter and machine rules interleave — a design
  // question flagged by QC review and deliberately deferred, not an oversight.
  const startAt = await nextSortOrder(admin, agentId, { reporterOnly: true });

  const { error: clearError } = await admin
    .from("voice_rules")
    .delete()
    .eq("agent_id", agentId)
    .not("provenance_model_call_id", "is", null);
  if (clearError) throw clearError;

  const { data, error } = await admin
    .from("voice_rules")
    .insert(
      sections.map((rule, index) => ({
        agent_id: agentId,
        rule,
        sort_order: startAt + index,
        provenance_model_call_id: provenanceModelCallId,
      })),
    )
    .select("*");
  if (error) throw error;
  return (data ?? []).map(toVoiceRule);
}
