"use client";

// app/agents/[id]/voice/rules-editor.tsx
//
// Voice's rules editor (page.tsx's Part C) — rows reuse setup/sources-card.tsx's row
// treatment: an inline remove button per row, an add-input below the list, Enter-to-add.
// Each row is read-only display text + an enabled Switch, not inline-editable — a rule is
// short-form prose (a materialized guide section or a hand-typed sentence), and adding a
// separate edit affordance on top of add/toggle/remove would be a second interaction model
// for the same handful of actions SourcesCard already established. Disabling a rule instead
// of always deleting it is the edit path that matters (flattenRulesToPrompt only reads
// enabled rules) — see task-24-report.md for the fuller reasoning.

import { PlusIcon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { VoiceRule } from "@/lib/voice/rules";
import { deleteVoiceRuleAction, saveVoiceRule, updateVoiceRuleAction } from "./actions";

export function RulesEditor({
  deskId,
  rules,
}: {
  readonly deskId: string;
  readonly rules: readonly VoiceRule[];
}) {
  const [input, setInput] = useState("");
  const [pendingRuleId, setPendingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await saveVoiceRule(deskId, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInput("");
    });
  }

  function handleToggle(ruleId: string, enabled: boolean) {
    setError(null);
    setPendingRuleId(ruleId);
    startTransition(async () => {
      const result = await updateVoiceRuleAction(deskId, ruleId, { enabled });
      if (!result.ok) setError(result.error);
      setPendingRuleId(null);
    });
  }

  function handleDelete(ruleId: string) {
    setError(null);
    setPendingRuleId(ruleId);
    startTransition(async () => {
      const result = await deleteVoiceRuleAction(deskId, ruleId);
      if (!result.ok) setError(result.error);
      setPendingRuleId(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-muted-foreground">Voice rules ({rules.length})</h3>
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules yet — add one below.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {rules.map((rule) => {
            const rowPending = isPending && pendingRuleId === rule.id;
            return (
              <div
                className="flex items-start gap-3 rounded-lg px-1.5 py-1.5 hover:bg-muted/50"
                key={rule.id}
              >
                <p className="flex-1 whitespace-pre-wrap text-sm text-foreground">{rule.rule}</p>
                <Switch
                  aria-label={rule.enabled ? "Disable this rule" : "Enable this rule"}
                  checked={rule.enabled}
                  disabled={rowPending}
                  onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                />
                <Button
                  aria-label="Remove this rule"
                  disabled={rowPending}
                  onClick={() => handleDelete(rule.id)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-1.5">
        <PlusIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <Input
          className="h-7 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
          disabled={isPending}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a rule — press Enter"
          value={input}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
