#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  readSync,
  renameSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import process from "node:process";

const SCHEMA_VERSION = 1;
const MAX_HANDOFF_BYTES = 7_000;
const MAX_HOOK_OUTPUT_BYTES = 9_000;
const TARGETS = new Set(["dev", "beta", "main"]);
const MODES = new Set(["tracked", "current"]);
const REQUIRED_HEADINGS = [
  "# Feature handoff",
  "## Objective and canonical sources",
  "## Checkpoint",
  "## Decisions and approvals",
  "## Implemented state",
  "## Verification",
  "## Open issues",
  "## Next safe action",
];

function fail(message) {
  throw new Error(message);
}

function git(root, args, options = {}) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: options.encoding ?? "utf8",
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
}

function repoRoot() {
  const candidate = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return git(candidate, ["rev-parse", "--show-toplevel"]).trim();
}

function currentBranch(root) {
  try {
    return git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]).trim();
  } catch {
    return "";
  }
}

function currentHead(root) {
  return git(root, ["rev-parse", "HEAD"]).trim();
}

function canonicalCommit(root, value, label) {
  if (!value) fail(`Missing ${label}`);
  try {
    return git(root, ["rev-parse", "--verify", `${value}^{commit}`]).trim();
  } catch {
    fail(`${label} is not a local commit: ${value}`);
  }
}

function validateBranch(root, branch) {
  if (!branch) fail("Missing --branch");
  try {
    git(root, ["check-ref-format", "--branch", branch]);
  } catch {
    fail(`Invalid branch name: ${branch}`);
  }
  return branch;
}

function requireCurrentBranch(root, branch) {
  const current = currentBranch(root);
  if (!current) fail("Feature handoff is unavailable on a detached HEAD");
  if (current !== branch) {
    fail(`Branch mismatch: requested ${branch}, current branch is ${current}`);
  }
}

function featureRoot(root) {
  return join(root, ".context", "features");
}

function branchDirectory(root, branch) {
  validateBranch(root, branch);
  const base = resolve(featureRoot(root));
  const directory = resolve(base, ...branch.split("/"));
  if (!directory.startsWith(`${base}${sep}`)) {
    fail(`Unsafe branch path: ${branch}`);
  }
  return directory;
}

function statePath(root, branch) {
  return join(branchDirectory(root, branch), "state.json");
}

function handoffPath(root, branch) {
  return join(branchDirectory(root, branch), "handoff.md");
}

function atomicWrite(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(
    dirname(path),
    `.${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`,
  );
  writeFileSync(temporary, contents, { mode: 0o600 });
  renameSync(temporary, path);
}

function writeState(root, branch, state) {
  atomicWrite(statePath(root, branch), `${JSON.stringify(state, null, 2)}\n`);
}

function readState(root, branch) {
  const path = statePath(root, branch);
  if (!existsSync(path)) return null;
  let state;
  try {
    state = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`Invalid handoff state JSON: ${path}`);
  }
  validateState(state);
  return state;
}

function validateState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    fail("Handoff state must be a JSON object");
  }
  if (state.schemaVersion !== SCHEMA_VERSION) {
    fail(`Unsupported handoff schema version: ${state.schemaVersion}`);
  }
  if (!MODES.has(state.mode)) fail(`Invalid handoff mode: ${state.mode}`);
  if (typeof state.branch !== "string" || !state.branch) {
    fail("Handoff state is missing branch");
  }
  if (state.issue !== null && !Number.isSafeInteger(state.issue)) {
    fail("Handoff issue must be an integer or null");
  }
  for (const key of [
    "baseSha",
    "sourceTip",
    "headSha",
    "worktreeFingerprint",
    "capturedAt",
    "phase",
    "gate",
    "releaseTarget",
    "approvedPlanRef",
  ]) {
    if (typeof state[key] !== "string" || !state[key]) {
      fail(`Handoff state is missing ${key}`);
    }
  }
  if (!TARGETS.has(state.releaseTarget)) {
    fail(`Invalid release target: ${state.releaseTarget}`);
  }
  if (typeof state.handoffReady !== "boolean") {
    fail("Handoff state is missing handoffReady");
  }
}

function hashFile(hash, absolutePath) {
  const descriptor = openSync(absolutePath, "r");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  try {
    while (true) {
      const count = readSync(descriptor, buffer, 0, buffer.length, null);
      if (count === 0) break;
      hash.update(buffer.subarray(0, count));
    }
  } finally {
    closeSync(descriptor);
  }
}

function worktreeFingerprint(root) {
  const hash = createHash("sha256");
  hash.update("feature-handoff-worktree-v1\0");

  for (const args of [
    ["diff", "--cached", "--binary", "--no-ext-diff", "--no-color", "HEAD", "--"],
    ["diff", "--binary", "--no-ext-diff", "--no-color", "--"],
  ]) {
    hash.update(git(root, args, { encoding: null }));
    hash.update("\0");
  }

  const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", "."], {
    encoding: null,
  })
    .toString("utf8")
    .split("\0")
    .filter((path) => path && path !== ".context" && !path.startsWith(".context/"));

  for (const path of untracked) {
    const absolutePath = join(root, path);
    const stat = lstatSync(absolutePath);
    hash.update("untracked\0");
    hash.update(path);
    hash.update("\0");
    hash.update(String(stat.mode));
    hash.update("\0");
    if (stat.isSymbolicLink()) {
      hash.update("symlink\0");
      hash.update(readlinkSync(absolutePath));
    } else if (stat.isFile()) {
      hash.update("file\0");
      hashFile(hash, absolutePath);
    } else {
      hash.update("other\0");
    }
    hash.update("\0");
  }

  return hash.digest("hex");
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) fail(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`Missing value for ${token}`);
    }
    if (Object.hasOwn(options, key)) fail(`Duplicate option: ${token}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function required(options, key) {
  const value = options[key];
  if (typeof value !== "string" || !value) fail(`Missing --${key}`);
  return value;
}

function validateTarget(value) {
  if (!TARGETS.has(value)) fail(`Invalid --target: ${value}`);
  return value;
}

function parseIssue(value) {
  if (value === undefined || value === "" || value === "null") return null;
  if (!/^\d+$/.test(value)) fail(`Invalid --issue: ${value}`);
  const issue = Number(value);
  if (!Number.isSafeInteger(issue) || issue < 1) fail(`Invalid --issue: ${value}`);
  return issue;
}

function rejectUnknown(options, allowed) {
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) fail(`Unknown option: --${key}`);
  }
}

function baseSnapshot(root, options) {
  const branch = validateBranch(root, required(options, "branch"));
  requireCurrentBranch(root, branch);
  const mode = required(options, "mode");
  if (!MODES.has(mode)) fail(`Invalid --mode: ${mode}`);
  const issue = parseIssue(options.issue);

  if (mode === "tracked") {
    const match = /^ft\/(\d+)$/.exec(branch);
    if (!match || issue === null || Number(match[1]) !== issue) {
      fail("Tracked mode requires matching --branch ft/<issue> and --issue <issue>");
    }
  } else if (branch !== "dev" || issue !== null) {
    fail("Current mode is allowed only on dev and cannot carry an issue");
  }

  const headSha = currentHead(root);
  const sourceTip = canonicalCommit(root, required(options, "source-tip"), "--source-tip");
  if (sourceTip !== headSha) {
    fail(`--source-tip must be current HEAD (${headSha}) during initialization`);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    mode,
    issue,
    branch,
    baseSha: canonicalCommit(root, required(options, "base-sha"), "--base-sha"),
    sourceTip,
    headSha,
    worktreeFingerprint: worktreeFingerprint(root),
    capturedAt: new Date().toISOString(),
    phase: required(options, "phase"),
    gate: required(options, "gate"),
    releaseTarget: validateTarget(required(options, "target")),
    approvedPlanRef: required(options, "approved-plan"),
    handoffReady: false,
  };
}

function commandInit(root, options) {
  rejectUnknown(
    options,
    new Set([
      "mode",
      "branch",
      "issue",
      "base-sha",
      "source-tip",
      "phase",
      "gate",
      "target",
      "approved-plan",
    ]),
  );
  const state = baseSnapshot(root, options);
  writeState(root, state.branch, state);
  process.stdout.write(`${statePath(root, state.branch)}\n`);
}

function applyMutableOptions(root, state, options) {
  const next = { ...state };
  if (options["source-tip"] !== undefined) {
    next.sourceTip = canonicalCommit(root, options["source-tip"], "--source-tip");
  }
  if (options.phase !== undefined) next.phase = required(options, "phase");
  if (options.gate !== undefined) next.gate = required(options, "gate");
  if (options.target !== undefined) next.releaseTarget = validateTarget(options.target);
  if (options["approved-plan"] !== undefined) {
    next.approvedPlanRef = required(options, "approved-plan");
  }
  return next;
}

function commandUpdate(root, options) {
  rejectUnknown(
    options,
    new Set(["branch", "source-tip", "phase", "gate", "target", "approved-plan"]),
  );
  const branch = validateBranch(root, required(options, "branch"));
  requireCurrentBranch(root, branch);
  const state = readState(root, branch);
  if (!state) fail(`No handoff state exists for ${branch}`);
  if (state.branch !== branch) fail(`Stored branch does not match ${branch}`);

  const headSha = currentHead(root);
  const next = {
    ...applyMutableOptions(root, state, options),
    headSha,
    worktreeFingerprint: worktreeFingerprint(root),
    capturedAt: new Date().toISOString(),
    handoffReady: false,
  };
  if (options["source-tip"] === undefined) next.sourceTip = headSha;
  writeState(root, branch, next);
  process.stdout.write(`${statePath(root, branch)}\n`);
}

function unsafeHandoffReason(contents) {
  if (contents.includes("\0")) return "contains a NUL byte";
  if (/^diff --git /m.test(contents) || /^@@ -\d+(?:,\d+)? \+\d+/m.test(contents)) {
    return "contains a raw diff";
  }
  if (/^\s*(?:Human|Assistant|User):\s/m.test(contents)) {
    return "contains raw transcript markers";
  }
  if (/<\/?(?:thinking|reasoning)>/i.test(contents) || /chain[- ]of[- ]thought/i.test(contents)) {
    return "contains reasoning-trace markers";
  }
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/.test(contents) ||
    /\b(?:sk|ghp|github_pat|xox[abprs])[-_][A-Za-z0-9_-]{12,}\b/.test(contents) ||
    /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{8,}/i.test(contents)
  ) {
    return "contains secret-like material";
  }
  for (const heading of REQUIRED_HEADINGS) {
    if (!contents.includes(heading)) return `is missing required heading: ${heading}`;
  }
  return "";
}

function commandCapture(root, options) {
  rejectUnknown(
    options,
    new Set(["branch", "input", "source-tip", "phase", "gate", "target", "approved-plan"]),
  );
  const branch = validateBranch(root, required(options, "branch"));
  requireCurrentBranch(root, branch);
  const state = readState(root, branch);
  if (!state) fail(`No handoff state exists for ${branch}; initialize it first`);
  if (state.branch !== branch) fail(`Stored branch does not match ${branch}`);

  const directory = branchDirectory(root, branch);
  const input = resolve(root, required(options, "input"));
  const expectedInput = join(directory, "handoff.next.md");
  if (input !== expectedInput) {
    fail(`--input must be the branch-local draft: ${expectedInput}`);
  }
  if (!existsSync(input)) fail(`Handoff draft does not exist: ${input}`);

  const bytes = readFileSync(input);
  if (bytes.length === 0) fail("Handoff draft is empty");
  if (bytes.length > MAX_HANDOFF_BYTES) {
    fail(`Handoff is ${bytes.length} bytes; maximum is ${MAX_HANDOFF_BYTES}`);
  }
  const contents = bytes.toString("utf8");
  const unsafeReason = unsafeHandoffReason(contents);
  if (unsafeReason) fail(`Handoff ${unsafeReason}`);

  const destination = handoffPath(root, branch);
  const temporary = join(directory, `.handoff-${process.pid}-${Date.now()}.tmp`);
  copyFileSync(input, temporary);
  renameSync(temporary, destination);
  unlinkSync(input);

  const headSha = currentHead(root);
  const next = {
    ...applyMutableOptions(root, state, options),
    sourceTip: options["source-tip"]
      ? canonicalCommit(root, options["source-tip"], "--source-tip")
      : headSha,
    headSha,
    worktreeFingerprint: worktreeFingerprint(root),
    capturedAt: new Date().toISOString(),
    handoffReady: true,
  };
  writeState(root, branch, next);
  process.stdout.write(`${destination}\n`);
}

function commandPath(root, options) {
  rejectUnknown(options, new Set(["branch"]));
  const branch = validateBranch(root, required(options, "branch"));
  process.stdout.write(`${branchDirectory(root, branch)}\n`);
}

function commandShow(root, options) {
  rejectUnknown(options, new Set(["branch"]));
  const branch = validateBranch(root, required(options, "branch"));
  const state = readState(root, branch);
  if (!state) fail(`No handoff state exists for ${branch}`);
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
}

function pruneEmptyBranchParents(root, directory) {
  const base = resolve(featureRoot(root));
  let current = dirname(directory);
  while (current.startsWith(`${base}${sep}`)) {
    if (!existsSync(current) || readdirSync(current).length > 0) break;
    rmdirSync(current);
    current = dirname(current);
  }
}

function commandClear(root, options) {
  rejectUnknown(options, new Set(["branch"]));
  const branch = validateBranch(root, required(options, "branch"));
  const directory = branchDirectory(root, branch);
  rmSync(directory, { recursive: true, force: true });
  pruneEmptyBranchParents(root, directory);
  process.stdout.write(`Cleared feature handoff for ${branch}\n`);
}

function shortHookNotice(message) {
  return `Feature-flow handoff notice: ${message}`;
}

function emitHookContext(additionalContext) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext,
    },
  };
  const serialized = JSON.stringify(output);
  if (Buffer.byteLength(serialized) > MAX_HOOK_OUTPUT_BYTES) {
    fail("SessionStart handoff output exceeded its safety limit");
  }
  process.stdout.write(`${serialized}\n`);
}

function commandHook(root) {
  const branch = currentBranch(root);
  if (!branch) return;
  const path = statePath(root, branch);
  const checkpointPath = handoffPath(root, branch);
  if (!existsSync(path)) return;

  let state;
  try {
    state = readState(root, branch);
  } catch {
    emitHookContext(
      shortHookNotice(`state at ${path} is invalid; run /feature-handoff to replace it.`),
    );
    return;
  }

  if (state.branch !== branch) {
    emitHookContext(
      shortHookNotice(`state at ${path} does not belong to branch ${branch}; it was not loaded.`),
    );
    return;
  }
  if (!state.handoffReady || !existsSync(handoffPath(root, branch))) {
    emitHookContext(
      shortHookNotice(
        `state at ${path} exists, but no current handoff is sealed at ${checkpointPath}; run /feature-handoff before switching sessions.`,
      ),
    );
    return;
  }

  const headSha = currentHead(root);
  if (state.headSha !== headSha) {
    emitHookContext(
      shortHookNotice(
        `the checkpoint at ${checkpointPath} is stale because HEAD changed; it was not loaded.`,
      ),
    );
    return;
  }

  const fingerprint = worktreeFingerprint(root);
  if (state.worktreeFingerprint !== fingerprint) {
    emitHookContext(
      shortHookNotice(
        `the checkpoint at ${checkpointPath} is stale because the worktree changed; it was not loaded.`,
      ),
    );
    return;
  }

  const bytes = readFileSync(handoffPath(root, branch));
  if (bytes.length === 0 || bytes.length > MAX_HANDOFF_BYTES) {
    emitHookContext(
      shortHookNotice(
        `the checkpoint at ${checkpointPath} failed its size check; it was not loaded.`,
      ),
    );
    return;
  }
  const handoff = bytes.toString("utf8");
  if (unsafeHandoffReason(handoff)) {
    emitHookContext(
      shortHookNotice(
        `the checkpoint at ${checkpointPath} failed its safety check; it was not loaded.`,
      ),
    );
    return;
  }

  emitHookContext(
    [
      `Feature-flow handoff for exact branch ${branch}, captured ${state.capturedAt}.`,
      "This is a bounded checkpoint, not a substitute for revalidating the repository before acting.",
      "",
      handoff,
    ].join("\n"),
  );
}

function main() {
  const command = process.argv[2];
  if (!command) fail("Missing command");
  const root = repoRoot();
  const options = parseArguments(process.argv.slice(3));

  switch (command) {
    case "init":
      commandInit(root, options);
      break;
    case "update":
      commandUpdate(root, options);
      break;
    case "capture":
      commandCapture(root, options);
      break;
    case "path":
      commandPath(root, options);
      break;
    case "show":
      commandShow(root, options);
      break;
    case "clear":
      commandClear(root, options);
      break;
    case "fingerprint":
      rejectUnknown(options, new Set());
      process.stdout.write(`${worktreeFingerprint(root)}\n`);
      break;
    case "hook":
      rejectUnknown(options, new Set());
      commandHook(root);
      break;
    default:
      fail(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `feature-handoff: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
