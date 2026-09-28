import "server-only";

import { escapeXmlText } from "@/lib/xml";
import { checkCard, checkHeadline, decodeText, normalize } from "./checks";
import { REPAIR_INSTRUCTION, WRITER_SYSTEM } from "./prompts";
import {
  type CheckResult,
  type Fact,
  type FeedContext,
  type ItemView,
  SUPPORT_LINE,
  type VerifiedCard,
  type WriteRecord,
  type WriteResult,
} from "./types";
import { writeDraft, writerMessage } from "./writer";

function sameFact(first: Fact, second: Fact): boolean {
  return (
    first.text === second.text &&
    first.evidence.length === second.evidence.length &&
    first.evidence.every(
      (evidence, index) =>
        evidence.item === second.evidence[index].item &&
        normalize(evidence.span) === normalize(second.evidence[index].span),
    )
  );
}
export async function writeCard(
  context: FeedContext,
  previous: VerifiedCard | null,
  items: ItemView[],
  trigger: WriteRecord["trigger"],
): Promise<WriteResult> {
  const user = writerMessage(context, previous);
  const allowed = new Set([
    context.item.id,
    ...(previous?.facts.flatMap((fact) => fact.evidence.map((entry) => entry.item)) ?? []),
  ]);
  const record: WriteRecord = {
    trigger,
    item: context.item.id,
    system: WRITER_SYSTEM,
    user,
    attempts: [],
    raw: null,
    checks: null,
    group: {},
    adds: {},
    repair: null,
    headline_from: "writer",
    titleScore: null,
    final: "write failed",
    verified: null,
  };
  const raw = await writeDraft(context, user, allowed, record.attempts);
  record.raw = raw;
  if (!raw) return { card: null, status: "write_failed", record };
  let card = raw;
  let checks = await checkCard(raw, items, context);
  record.checks = checks;
  if (
    !checks.error &&
    (checks.drops.length || (checks.facts.length && (checks.headlineScore ?? 0) < SUPPORT_LINE))
  ) {
    const lines = checks.facts.map(
      ({ text, evidence }) => `kept: ${JSON.stringify({ text, evidence })}`,
    );
    lines.push(
      ...checks.drops.map((drop) => `failed: ${drop.fact.text} (${drop.reasons.join("; ")})`),
    );
    if (checks.facts.length && (checks.headlineScore ?? 0) < SUPPORT_LINE)
      lines.push(`headline failed: ${raw.headline} (it states something the kept facts do not)`);
    const repairUser = `${user}\n<repair>${escapeXmlText(lines.join("\n"))}</repair>\n${REPAIR_INSTRUCTION}`;
    const repaired = await writeDraft(context, repairUser, allowed, record.attempts, true);
    let repairedChecks: CheckResult | null = null;
    if (repaired) repairedChecks = await checkCard(repaired, items, context);
    const used = Boolean(
      repaired &&
        repairedChecks &&
        !repairedChecks.error &&
        repairedChecks.facts.length >= checks.facts.length &&
        checks.facts.every((fact) => repairedChecks?.facts.some((next) => sameFact(fact, next))),
    );
    record.repair = {
      user: repairUser,
      card: repaired,
      checks: repairedChecks,
      used,
      note: used ? "All kept facts survived unchanged" : "Repair failed or lost a kept fact",
    };
    if (used && repaired && repairedChecks) {
      card = repaired;
      checks = repairedChecks;
    }
  }
  if (!checks.facts.length) {
    record.final = "no card: no fact survived";
    return { card: null, status: "no_card", record };
  }
  let headline = card.headline;
  if ((checks.headlineScore ?? 0) < SUPPORT_LINE) {
    const first = checks.facts[0];
    const item = items.find((candidate) => candidate.id === first.evidence[0].item);
    const title = item
      ? `${item.publisher}: ${decodeText(item.title).replace(/\s+/g, " ").trim()}`
      : "";
    if (title && !title.includes("\u2014"))
      record.titleScore = await checkHeadline(title, checks.facts, items, context);
    if ((record.titleScore ?? 0) >= SUPPORT_LINE) {
      headline = title;
      record.headline_from = "title";
    } else {
      headline = first.text;
      record.headline_from = "first fact";
    }
  }
  const publishers = new Map<string, VerifiedCard["publishers"][number]>();
  for (const item of items)
    publishers.set(item.source_id, {
      source_id: item.source_id,
      name: item.publisher,
      url: item.url,
    });
  const verified: VerifiedCard = {
    headline,
    facts: checks.facts,
    publishers: [...publishers.values()],
    image: items.find((item) => item.image)?.image ?? null,
    headline_from: record.headline_from,
  };
  record.final = "card";
  record.verified = verified;
  return { card: verified, status: "written", record };
}
