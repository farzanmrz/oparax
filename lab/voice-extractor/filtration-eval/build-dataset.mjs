import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const HANDLES = [
  "FabrizioRomano",
  "DavidOrnstein",
  "Glongari",
  "talkfcb_",
  "fcbarcelona",
  "BarcaUniversal",
  "BarcaTimes",
  "fcbarcelonaes",
  "Barca_Buzz",
  "TotalBarca",
  "BarcaWorld_",
  "laligaen",
  "MundoDeportivo",
  "sport",
  "managingbarca",
  "barcacentre",
  "Gerardanyol",
  "siegersayss",
  "AlbertRoge",
  "footmercato",
];

const HANDLE_BY_LOWERCASE = new Map(HANDLES.map((handle) => [handle.toLowerCase(), handle]));

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(`Invalid argument near ${key ?? "end of input"}`);
    }
    args.set(key.slice(2), value);
  }
  return args;
}

function canonicalHandle(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/^@/, "").trim();
  return HANDLE_BY_LOWERCASE.get(cleaned.toLowerCase()) ?? null;
}

function handleFromUrl(value) {
  if (typeof value !== "string") return null;
  try {
    return canonicalHandle(new URL(value).pathname.split("/").filter(Boolean)[0]);
  } catch {
    return null;
  }
}

function array(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function cleanString(value) {
  return typeof value === "string" ? value : null;
}

function toTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

const args = parseArgs(process.argv.slice(2));
const profilesPath = args.get("profiles");
const marketplaceDirectory = args.get("marketplace-dir");
const statusProbePath = args.get("status-probe");
const outputDirectory = path.resolve(
  args.get("output") ?? path.dirname(new URL(import.meta.url).pathname),
);

if (!profilesPath || !marketplaceDirectory) {
  throw new Error(
    "Usage: node build-dataset.mjs --profiles <response.json> " +
      "--marketplace-dir <directory> [--status-probe <result.json>] " +
      "[--output <directory>]",
  );
}

const candidatesById = new Map();
const contextById = new Map();
const observedInputErrors = [];

function mergePost({
  postId,
  sourceHandle,
  postContent,
  postUrl,
  datePosted,
  photos,
  videos,
  externalImageUrls,
  externalVideoUrls,
  externalUrl,
  quotedPost,
  isRepost,
  parentPostDetails,
  sourceSurface,
}) {
  const id = String(postId ?? "").trim();
  const handle = canonicalHandle(sourceHandle);
  if (!id || !handle) return;

  const content = typeof postContent === "string" ? postContent : "";
  const currentCandidate = candidatesById.get(id);
  if (!currentCandidate) {
    candidatesById.set(id, {
      postId: id,
      sourceHandle: handle,
      postContent: content,
      onBeat: null,
    });
  } else if (!currentCandidate.postContent && content) {
    currentCandidate.postContent = content;
  }

  const currentContext = contextById.get(id) ?? {
    postId: id,
    postUrl: null,
    datePosted: null,
    photos: [],
    videos: [],
    externalImageUrls: [],
    externalVideoUrls: [],
    externalUrl: null,
    quotedPost: null,
    isRepost: null,
    parentPostDetails: null,
    sourceSurfaces: [],
  };

  currentContext.postUrl ??= cleanString(postUrl);
  currentContext.datePosted ??= cleanString(datePosted);
  currentContext.photos = [...new Set([...currentContext.photos, ...array(photos)])];
  currentContext.videos = [...new Set([...currentContext.videos, ...array(videos)])];
  currentContext.externalImageUrls = [
    ...new Set([...currentContext.externalImageUrls, ...array(externalImageUrls)]),
  ];
  currentContext.externalVideoUrls = [
    ...new Set([...currentContext.externalVideoUrls, ...array(externalVideoUrls)]),
  ];
  currentContext.externalUrl ??= cleanString(externalUrl);
  currentContext.quotedPost ??= quotedPost ?? null;
  currentContext.isRepost ??= typeof isRepost === "boolean" ? isRepost : null;
  currentContext.parentPostDetails ??= parentPostDetails ?? null;
  if (!currentContext.sourceSurfaces.includes(sourceSurface)) {
    currentContext.sourceSurfaces.push(sourceSurface);
  }
  contextById.set(id, currentContext);
}

const profileRecords = JSON.parse(await readFile(profilesPath, "utf8"));
for (const profile of profileRecords) {
  const sourceHandle = handleFromUrl(profile.input?.url ?? profile.url);
  if (profile.error || profile.error_code) {
    observedInputErrors.push({
      sourceHandle,
      sourceSurface: "x_profiles",
      errorCode: profile.error_code ?? null,
      error: profile.error ?? null,
    });
    continue;
  }

  for (const post of array(profile.posts)) {
    mergePost({
      postId: post.post_id ?? post.id,
      sourceHandle,
      postContent: post.description,
      postUrl: post.post_url ?? post.url,
      datePosted: post.date_posted,
      photos: post.photos,
      videos: post.videos,
      sourceSurface: "x_profiles",
    });
  }
}

const marketplaceFiles = (await readdir(marketplaceDirectory))
  .filter((filename) => filename.startsWith("volume-data-") && filename.endsWith(".json"))
  .sort();

for (const filename of marketplaceFiles) {
  const records = JSON.parse(await readFile(path.join(marketplaceDirectory, filename), "utf8"));
  for (const post of array(records)) {
    mergePost({
      postId: post.id,
      sourceHandle: post.user_posted,
      postContent: post.description,
      postUrl: post.url,
      datePosted: post.date_posted,
      photos: post.photos,
      videos: post.videos,
      externalImageUrls: post.external_image_urls,
      externalVideoUrls: post.external_video_urls,
      externalUrl: post.external_url,
      quotedPost: post.quoted_post,
      isRepost: post.is_repost,
      parentPostDetails: post.parent_post_details,
      sourceSurface: "x_posts_marketplace",
    });
  }
}

if (statusProbePath) {
  const records = JSON.parse(await readFile(statusProbePath, "utf8"));
  for (const post of array(records)) {
    mergePost({
      postId: post.id,
      sourceHandle: post.user_posted,
      postContent: post.description,
      postUrl: post.url,
      datePosted: post.date_posted,
      photos: post.photos,
      videos: post.videos,
      externalUrl: post.external_url,
      quotedPost: post.quoted_post,
      isRepost: post.is_repost,
      parentPostDetails: post.parent_post_details,
      sourceSurface: "x_posts_status_probe",
    });
  }
}

const handleIndex = new Map(HANDLES.map((handle, index) => [handle, index]));
const candidates = [...candidatesById.values()].sort((left, right) => {
  const byHandle =
    (handleIndex.get(left.sourceHandle) ?? HANDLES.length) -
    (handleIndex.get(right.sourceHandle) ?? HANDLES.length);
  if (byHandle !== 0) return byHandle;
  const byDate =
    toTimestamp(contextById.get(right.postId)?.datePosted) -
    toTimestamp(contextById.get(left.postId)?.datePosted);
  return byDate || left.postId.localeCompare(right.postId);
});
const reviewContext = candidates.map(({ postId }) => contextById.get(postId));

const countsByHandle = Object.fromEntries(HANDLES.map((handle) => [handle, 0]));
for (const candidate of candidates) countsByHandle[candidate.sourceHandle] += 1;

const countsBySurface = {};
for (const context of reviewContext) {
  for (const surface of context.sourceSurfaces) {
    countsBySurface[surface] = (countsBySurface[surface] ?? 0) + 1;
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  status: "unlabeled",
  targetBeat: "All news around FC Barcelona",
  requestedHandles: HANDLES,
  totalCandidates: candidates.length,
  countsByHandle,
  countsBySurface,
  handlesWithoutCandidates: HANDLES.filter((handle) => countsByHandle[handle] === 0),
  observedInputErrors,
  schema: {
    candidates: ["postId", "sourceHandle", "postContent", "onBeat"],
    labelState: "onBeat is null until golden labeling; final values must be boolean",
    reviewContext:
      "Sidecar only. It is joined to candidates by postId and is not part of the golden-label schema.",
  },
};

const jsonLines = (records) =>
  records.length === 0 ? "" : `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;

await mkdir(path.join(outputDirectory, "by-source"), { recursive: true });
await writeFile(
  path.join(outputDirectory, "candidate-posts.unlabeled.jsonl"),
  jsonLines(candidates),
);
await writeFile(path.join(outputDirectory, "review-context.jsonl"), jsonLines(reviewContext));
await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

for (const handle of HANDLES) {
  await writeFile(
    path.join(outputDirectory, "by-source", `${handle}.unlabeled.jsonl`),
    jsonLines(candidates.filter((candidate) => candidate.sourceHandle === handle)),
  );
}

console.log(JSON.stringify(manifest, null, 2));
