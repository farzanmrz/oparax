import "server-only";

import { jev, type Question } from "@/lib/ai/jev";
import { BudgetRefused, CostUnbounded } from "@/lib/guards/ledger";
import { ATTRIBUTION_QUESTION, HEADLINE_QUESTION, SUPPORT_QUESTION } from "./prompts";
import {
  type Card,
  type CheckResult,
  errorMessage,
  type Fact,
  type FeedContext,
  type ItemView,
  SUPPORT_LINE,
  type VerifiedFact,
} from "./types";

export class FeedDeadline extends Error {
  constructor() {
    super("feed deadline");
  }
}
export function requireTime(context: FeedContext): void {
  if (Date.now() >= context.deadline) throw new FeedDeadline();
}
export function rethrowStop(error: unknown): void {
  if (
    error instanceof BudgetRefused ||
    error instanceof CostUnbounded ||
    error instanceof FeedDeadline
  )
    throw error;
}
export function decodeText(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (whole, entity: string) => {
      const named: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " ",
      };
      if (entity[0] !== "#") return named[entity.toLowerCase()] ?? whole;
      const point =
        entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number(entity.slice(1));
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point)
        : whole;
    },
  );
}
export function normalize(text: string): string {
  return decodeText(text)
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}
function codeReasons(fact: Fact, items: ItemView[]): string[] {
  const reasons: string[] = [];
  let bodyEvidence = false;
  const cited: string[] = [];
  for (const evidence of fact.evidence) {
    const item = items.find((candidate) => candidate.id === evidence.item);
    if (!item) {
      reasons.push(`unknown item: ${evidence.item}`);
      continue;
    }
    const span = normalize(evidence.span);
    const body = normalize(
      item.kind === "article" ? item.text.replace(`${item.title}\n\n`, "") : item.text,
    );
    const full = normalize(`${item.title}\n${item.text}`);
    cited.push(full);
    if (!span || !full.includes(span))
      reasons.push(span.includes("...") ? "ellipsis not in article" : "span not in article");
    if (span && body.includes(span)) bodyEvidence = true;
  }
  if (!bodyEvidence) reasons.push("title-only evidence");
  for (const match of normalize(fact.text).matchAll(
    /(?<![\p{L}\p{N}.-])\d+(?:[.,]\d+)*(?:%|\b)/gu,
  )) {
    if (
      !cited.some((article) =>
        new RegExp(`(?<![\\d.])${match[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d.])`).test(
          article,
        ),
      )
    )
      reasons.push(`number not in cited article: ${match[0]}`);
  }
  return reasons;
}
function itemState(items: ItemView[]) {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      { publisher: item.publisher, title: item.title, text: item.text },
    ]),
  );
}
export async function checkHeadline(
  headline: string,
  facts: VerifiedFact[],
  items: ItemView[],
  context: FeedContext,
): Promise<number | null> {
  requireTime(context);
  try {
    return (
      await jev(
        { headline, facts, items: itemState(items) },
        { headline: HEADLINE_QUESTION },
        { kind: "headline", monitorId: context.monitorId, sourceId: context.item.source_id },
      )
    ).headline;
  } catch (error) {
    rethrowStop(error);
    return null;
  }
}
export async function checkCard(
  card: Card,
  items: ItemView[],
  context: FeedContext,
): Promise<CheckResult> {
  const result: CheckResult = {
    facts: [],
    drops: [],
    scores: {},
    headlineScore: null,
    error: null,
  };
  const candidates = card.facts.filter((fact) => {
    const reasons = codeReasons(fact, items);
    if (reasons.length) result.drops.push({ fact, check: "code", reasons });
    return !reasons.length;
  });
  if (!candidates.length) return result;
  const questions: Record<string, Question> = {};
  candidates.forEach((_, index) => {
    for (const [kind, question] of [
      ["support", SUPPORT_QUESTION],
      ["attribution", ATTRIBUTION_QUESTION],
    ] as const) {
      questions[`${kind}_${index}`] = {
        ...question,
        instructions: question.instructions.replaceAll("f<i>", `f${index}`),
      };
    }
  });
  requireTime(context);
  try {
    result.scores = await jev(
      {
        items: itemState(items),
        facts: Object.fromEntries(
          candidates.map((fact, index) => [
            `f${index}`,
            { fact: fact.text, evidence: fact.evidence },
          ]),
        ),
      },
      questions,
      { kind: "support", monitorId: context.monitorId, sourceId: context.item.source_id },
    );
  } catch (error) {
    rethrowStop(error);
    result.error = `support check failed; held: ${errorMessage(error)}`;
    for (const fact of candidates)
      result.drops.push({ fact, check: "jev support", reasons: [result.error] });
    return result;
  }
  candidates.forEach((fact, index) => {
    const support = result.scores[`support_${index}`];
    const attribution = result.scores[`attribution_${index}`];
    const reasons = [];
    if (support < SUPPORT_LINE) reasons.push("not supported at the same certainty");
    if (attribution < SUPPORT_LINE) reasons.push("wrong attribution");
    if (reasons.length) result.drops.push({ fact, check: "jev support", reasons });
    else result.facts.push({ ...fact, support, attribution });
  });
  if (result.facts.length)
    result.headlineScore = await checkHeadline(card.headline, result.facts, items, context);
  return result;
}
