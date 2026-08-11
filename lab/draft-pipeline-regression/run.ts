import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SourceBrief } from "@/lib/agent/draft-council-run";
import { filterSourcePost } from "@/lib/agent/draft-filter";
import { synthesizeSourcePost } from "@/lib/agent/draft-synthesize";
import { translateSourcePost } from "@/lib/agent/draft-translate";
import { draftSourcePost } from "@/lib/agent/draft-write";
import { resolveDraftingPrompt, type VoiceRule } from "@/lib/voice/rules";
import { runOldPath } from "./baseline/old-path";
import type { RegressionFixture } from "./cases";

const stable = (value: unknown) => JSON.stringify(value);
const hash = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");
const now = () => performance.now();
const artifactPath = join(process.cwd(), ".feature/regression-120.json");

type AssertionCheck = { label: string; pass: boolean; guidance?: boolean };
type PathResult = {
  filter: Awaited<ReturnType<typeof filterSourcePost>>["verdict"];
  synthesis: Awaited<ReturnType<typeof synthesizeSourcePost>>["verdict"];
  draft: Awaited<ReturnType<typeof draftSourcePost>>["verdict"];
  synthesisOutputOrder: string[];
  elapsedMs: number;
};
type FixturePathResult =
  | { result: PathResult; checks: AssertionCheck[]; pass: boolean }
  | { error: string; checks: AssertionCheck[]; pass: false };
type TrialPathName = "old" | "direct" | "translate";
type TrialPathResult =
  | { ok: true; elapsedMs: number; output: unknown }
  | { ok: false; elapsedMs: number; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function briefOf(fixture: RegressionFixture): SourceBrief {
  return {
    sourcePostId: fixture.source.sourcePostId,
    xPostId: fixture.source.xPostId ?? "",
    identity: fixture.source.identity,
    text: fixture.source.text,
    ...(fixture.source.title ? { title: fixture.source.title } : {}),
    lang: fixture.source.lang,
    media: fixture.source.media,
    publisherClaimKind: fixture.context.publisherClaimKind,
  };
}

async function runPath(
  fixture: RegressionFixture,
  mode: "direct" | "translate",
): Promise<PathResult> {
  const started = now();
  const brief = briefOf(fixture);
  const filter = await filterSourcePost({
    brief,
    beatSpec: fixture.context.beat,
    siteGuidance: fixture.context.siteGuidance,
  });
  if (!filter.verdict?.onBeat) {
    return {
      filter: filter.verdict,
      synthesis: null,
      draft: null,
      synthesisOutputOrder: [],
      elapsedMs: now() - started,
    };
  }
  let sourceText = brief.text;
  let sourceTitle = brief.title;
  if (mode === "translate") {
    const translated = await translateSourcePost({ brief });
    if (!translated.usable || !translated.englishSourceText) {
      throw new Error(`Unusable translation for ${fixture.id}`);
    }
    sourceText = translated.englishSourceText;
    sourceTitle = undefined;
  }
  const synthesis = await synthesizeSourcePost({
    brief,
    sourceText,
    sourceTitle,
  });
  if (!synthesis.verdict) throw new Error(`Unusable synthesis for ${fixture.id}`);
  const voiceGuidance = resolveDraftingPrompt(
    fixture.context.voiceGuide.rules as VoiceRule[],
    fixture.context.voiceGuide.measuredFacts,
    fixture.context.voiceGuide.guideDeploy,
  );
  const draft = await draftSourcePost({
    identity: brief.identity,
    newsTitle: synthesis.verdict.newsTitle,
    newsPoints: synthesis.verdict.newsPoints,
    voiceGuidance,
    platform: "x",
    accountTier: fixture.context.accountTier,
  });
  return {
    filter: filter.verdict,
    synthesis: synthesis.verdict,
    draft: draft.verdict,
    // The schema and normalized object place points before title as best-effort generation
    // guidance. This is recorded, not treated as proof of provider token order.
    synthesisOutputOrder: Object.keys(synthesis.verdict),
    elapsedMs: now() - started,
  };
}

function textOf(result: PathResult): string {
  return [
    result.synthesis?.newsTitle ?? "",
    ...(result.synthesis?.newsPoints.flatMap((point) => [point.reason, point.point]) ?? []),
    result.draft?.draft ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

function assertionsOf(fixture: RegressionFixture, result: PathResult): AssertionCheck[] {
  const assertions = fixture.assertions ?? {};
  const output = textOf(result);
  const checks: AssertionCheck[] = [];
  if (assertions.expectedOnBeat !== undefined) {
    checks.push({ label: "on-beat", pass: result.filter?.onBeat === assertions.expectedOnBeat });
  }
  for (const phrase of assertions.required ?? []) {
    checks.push({ label: `required:${phrase}`, pass: output.includes(phrase.toLowerCase()) });
  }
  for (const phrase of assertions.forbidden ?? []) {
    checks.push({ label: `forbidden:${phrase}`, pass: !output.includes(phrase.toLowerCase()) });
  }
  if (assertions.minPoints !== undefined) {
    checks.push({
      label: "minimum-points",
      pass: (result.synthesis?.newsPoints.length ?? 0) >= assertions.minPoints,
    });
  }
  if (assertions.maxPoints !== undefined) {
    checks.push({
      label: "maximum-points",
      pass: (result.synthesis?.newsPoints.length ?? Infinity) <= assertions.maxPoints,
    });
  }
  if (assertions.requiresMediaEvidence) {
    checks.push({
      label: "media-evidence-in-point-reason",
      pass:
        result.synthesis?.newsPoints.some((point) =>
          /\b(?:attachment|image|photo|pictured|visible|shows|depicts)\b/i.test(point.reason),
        ) ?? false,
    });
  }
  if (result.synthesis) {
    checks.push({
      label: "guidance:points-before-title",
      pass: result.synthesisOutputOrder.join(",") === "newsPoints,newsTitle",
      guidance: true,
    });
  }
  return checks;
}

async function runFixturePath(
  fixture: RegressionFixture,
  mode: "direct" | "translate",
): Promise<FixturePathResult> {
  try {
    const result = await runPath(fixture, mode);
    const checks = assertionsOf(fixture, result);
    return {
      result,
      checks,
      pass: checks.filter((check) => !check.guidance).every((check) => check.pass),
    };
  } catch (error) {
    return { error: errorMessage(error), checks: [], pass: false };
  }
}

async function loadFixtures(): Promise<RegressionFixture[]> {
  const directory = join(process.cwd(), "lab/draft-pipeline-regression/fixtures");
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as {
    fixtures: string[];
  };
  if (!manifest.fixtures.length) {
    throw new Error("No drafting regression fixtures. Run pnpm regression:drafting:export first.");
  }
  return Promise.all(
    manifest.fixtures.map(async (filename) => {
      const fixture = JSON.parse(
        await readFile(join(directory, filename), "utf8"),
      ) as RegressionFixture;
      const fixtureWithoutHashes = {
        id: fixture.id,
        source: fixture.source,
        context: fixture.context,
        provenance: fixture.provenance,
        assertions: fixture.assertions,
      };
      if (
        hash(fixture.source) !== fixture.hashes.source ||
        hash(fixture.context) !== fixture.hashes.context ||
        hash(fixtureWithoutHashes) !== fixture.hashes.fixture
      ) {
        throw new Error(`Fixture hash mismatch: ${filename}`);
      }
      return fixture;
    }),
  );
}

async function runTrialPath(
  path: TrialPathName,
  fixture: RegressionFixture,
): Promise<TrialPathResult> {
  const started = now();
  try {
    const output = path === "old" ? await runOldPath(fixture) : await runPath(fixture, path);
    return { ok: true, elapsedMs: now() - started, output };
  } catch (error) {
    return { ok: false, elapsedMs: now() - started, error: errorMessage(error) };
  }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

function oldTextOf(output: unknown): string {
  if (typeof output !== "object" || output === null) return "";
  const value = output as { newsTitle?: unknown; newsSynthesis?: unknown; draft?: unknown };
  return [value.newsTitle, value.newsSynthesis, value.draft]
    .filter((item): item is string => typeof item === "string")
    .join("\n")
    .toLowerCase();
}

function trialText(result: TrialPathResult): string {
  if (!result.ok) return "";
  if (typeof result.output === "object" && result.output !== null && "synthesis" in result.output) {
    return textOf(result.output as PathResult);
  }
  return oldTextOf(result.output);
}

async function main(): Promise<void> {
  const artifact: Record<string, unknown> = {
    issue: 120,
    createdAt: new Date().toISOString(),
    results: [],
    warmups: {},
    decoTrials: [],
    translatorRemovalPassed: false,
  };
  let exitGreen = false;
  try {
    const fixtures = await loadFixtures();
    // Correctness cases are independent of one another: fan them out with a
    // bounded worker pool. Only the timed Deco warm-ups/trials below stay
    // serial, because concurrency would distort their latency measurements.
    const CONCURRENCY = 8;
    const jobs = fixtures.flatMap((fixture) =>
      (["direct", "translate"] as const).map((mode) => ({ fixture, mode })),
    );
    const jobResults = new Map<
      string,
      { direct?: FixturePathResult; translated?: FixturePathResult }
    >();
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
        while (cursor < jobs.length) {
          const job = jobs[cursor];
          cursor += 1;
          const outcome = await runFixturePath(job.fixture, job.mode);
          const entry = jobResults.get(job.fixture.id) ?? {};
          if (job.mode === "direct") entry.direct = outcome;
          else entry.translated = outcome;
          jobResults.set(job.fixture.id, entry);
        }
      }),
    );
    const results = fixtures.map((fixture) => {
      const entry = jobResults.get(fixture.id);
      if (!entry?.direct || !entry.translated)
        throw new Error(`Missing path result for ${fixture.id}`);
      return {
        id: fixture.id,
        direct: entry.direct,
        translated: entry.translated,
        pass: entry.direct.pass && entry.translated.pass,
      };
    });
    artifact.results = results;

    const deco = fixtures.find((fixture) => fixture.id === "deco");
    if (!deco) throw new Error("Missing required Deco fixture");

    const warmups: Partial<Record<TrialPathName, TrialPathResult>> = {};
    for (const path of ["old", "direct", "translate"] as const) {
      warmups[path] = await runTrialPath(path, deco);
    }
    artifact.warmups = warmups;

    const orders: TrialPathName[][] = [
      ["old", "direct", "translate"],
      ["translate", "old", "direct"],
      ["direct", "translate", "old"],
    ];
    const decoTrials: Array<{
      index: number;
      order: TrialPathName[];
      paths: Partial<Record<TrialPathName, TrialPathResult>>;
    }> = [];
    for (const [index, order] of orders.entries()) {
      const paths: Partial<Record<TrialPathName, TrialPathResult>> = {};
      for (const path of order) paths[path] = await runTrialPath(path, deco);
      decoTrials.push({ index, order, paths });
    }
    artifact.decoTrials = decoTrials;

    const translatePassDirectFail: Array<{ fixture: string; assertion: string }> = [];
    let directFactCapture = 0;
    let translatedFactCapture = 0;
    for (const result of results) {
      for (const check of result.direct.checks) {
        if (check.label.startsWith("required:") && check.pass) directFactCapture += 1;
      }
      for (const translatedCheck of result.translated.checks) {
        if (translatedCheck.label.startsWith("required:") && translatedCheck.pass) {
          translatedFactCapture += 1;
        }
        const directCheck = result.direct.checks.find(
          (check) => check.label === translatedCheck.label,
        );
        if (!translatedCheck.guidance && translatedCheck.pass && directCheck?.pass === false) {
          translatePassDirectFail.push({ fixture: result.id, assertion: translatedCheck.label });
        }
      }
    }

    const modalityUpgradeHits: Array<{ trial: number; phrase: string }> = [];
    const modalityPatterns = [
      /\bdeco\s+(?:has\s+|had\s+)?(?:confirmed|confirms|confirming)\b/i,
      /\bconfirmation\s+(?:from|by)\s+deco\b/i,
    ];
    for (const trial of decoTrials) {
      const direct = trial.paths.direct;
      if (!direct) continue;
      const output = trialText(direct);
      for (const pattern of modalityPatterns) {
        const match = output.match(pattern);
        if (match) modalityUpgradeHits.push({ trial: trial.index, phrase: match[0] });
      }
    }

    const oldLatencies = decoTrials.flatMap((trial) => {
      const value = trial.paths.old;
      return value?.ok ? [value.elapsedMs] : [];
    });
    const directLatencies = decoTrials.flatMap((trial) => {
      const value = trial.paths.direct;
      return value?.ok ? [value.elapsedMs] : [];
    });
    const oldMedianMs = median(oldLatencies);
    const directMedianMs = median(directLatencies);
    const criteria = {
      allFixtureAssertionsGreen: results.every((result) => result.pass),
      warmupsCompleted: Object.values(warmups).every((result) => result?.ok === true),
      threeCompleteAlternatingTrials: decoTrials.every((trial) =>
        (["old", "direct", "translate"] as const).every((path) => trial.paths[path]?.ok === true),
      ),
      zeroDecoModalityUpgrades: modalityUpgradeHits.length === 0,
      noTranslatePassDirectFail: translatePassDirectFail.length === 0,
      directFactCaptureAtLeastTranslated: directFactCapture >= translatedFactCapture,
      directMedianBelowOld:
        oldMedianMs !== null && directMedianMs !== null && directMedianMs < oldMedianMs,
    };
    artifact.translatorRemovalCriteria = {
      criteria,
      directFactCapture,
      translatedFactCapture,
      translatePassDirectFail,
      modalityUpgradeHits,
      oldMedianMs,
      directMedianMs,
    };
    artifact.translatorRemovalPassed = Object.values(criteria).every(Boolean);
    exitGreen = artifact.translatorRemovalPassed === true;
  } catch (error) {
    artifact.fatalError = errorMessage(error);
  }

  try {
    await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  } catch (error) {
    console.error(`Failed to write ${artifactPath}`, error);
    process.exitCode = 1;
    return;
  }
  if (!exitGreen) process.exitCode = 1;
}

void main();
