// THE one URL→media-type resolver for source attachments, shared by the pipeline's model
// stages (filter, synthesis). One copy, so a future upgrade can never land on one caller and
// not the other.
//
// This answers ONLY "how should the API decode these bytes". Whether the attachment was a photo,
// a video or an animated GIF is a separate axis carried by the caller's `kind` — and for video
// and GIF the url is a still poster frame either way, so both axes are always image types here.
//
// Returns `null` on an unparsable url instead of throwing: one malformed url from a live X
// response must not abort a call that has already billed. The caller drops that image and
// continues.

const IMAGE_MEDIA_TYPES = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
]);

const ALLOWED_MEDIA_HOSTS = new Set(["pbs.twimg.com"]);
const MAX_MODEL_ATTACHMENTS = 4;
const MEDIA_PROBE_TIMEOUT_MS = 8_000;
export const SUPPORTED_SOURCE_MEDIA_KINDS = new Set(["photo", "image", "video", "animated_gif"]);

export type ValidatedSourceMedia = { kind: string; imageUrl: string };
export type MediaValidationResult = {
  media: ValidatedSourceMedia[];
  /** The provider's admitted attachment count is a terminal, no-artifact input boundary. */
  oversized: boolean;
};

export function resolveImageMediaType(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    console.error(`source-media: skipping media with unparsable url: ${url}`, error);
    return null;
  }
  // X serves images as `/media/<id>?format=jpg&name=large` — the format is DECLARED IN THE QUERY
  // STRING and the path carries no extension at all, so a path-only read comes up empty on X's
  // standard image url. Read what the url declares first, then a path extension, and only guess
  // when neither says anything.
  const declared = parsed.searchParams.get("format")?.toLowerCase();
  const extension = parsed.pathname.split(".").pop()?.toLowerCase();
  return (
    (declared && IMAGE_MEDIA_TYPES.get(declared)) ||
    (extension && IMAGE_MEDIA_TYPES.get(extension)) ||
    "image/jpeg"
  );
}

/**
 * Admit only known delivery-worker media hosts before any model call. Redirects are refused so a
 * valid public descriptor cannot pivot the server-side fetch to a private address. Unsupported or
 * unreachable attachments are simply removed; text-led deliveries continue without them.
 */
export async function validateSourceMedia(
  media: { kind: string; imageUrl: string }[] | undefined,
  deadlineAt?: number,
): Promise<MediaValidationResult> {
  if (!media?.length) return { media: [], oversized: false };
  if (media.length > MAX_MODEL_ATTACHMENTS) return { media: [], oversized: true };

  const validated: ValidatedSourceMedia[] = [];
  for (const item of media) {
    if (!SUPPORTED_SOURCE_MEDIA_KINDS.has(item.kind)) {
      console.warn("source-media: dropped unsupported delivery media kind", {
        kind: item.kind,
      });
      continue;
    }
    let parsed: URL;
    try {
      parsed = new URL(item.imageUrl);
    } catch {
      console.warn("source-media: dropped malformed delivery media URL");
      continue;
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      (parsed.port && parsed.port !== "443") ||
      !ALLOWED_MEDIA_HOSTS.has(parsed.hostname.toLowerCase()) ||
      !resolveImageMediaType(parsed.toString())
    ) {
      console.warn("source-media: dropped unsupported delivery media host or type", {
        host: parsed.hostname,
      });
      continue;
    }

    const remaining = deadlineAt === undefined ? MEDIA_PROBE_TIMEOUT_MS : deadlineAt - Date.now();
    if (remaining <= 0) break;
    try {
      const response = await fetch(parsed, {
        method: "HEAD",
        redirect: "error",
        signal: AbortSignal.timeout(Math.min(MEDIA_PROBE_TIMEOUT_MS, remaining)),
      });
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!response.ok || !contentType.startsWith("image/")) {
        console.warn("source-media: dropped unavailable or non-image delivery media", {
          host: parsed.hostname,
          status: response.status,
          contentType,
        });
        continue;
      }
      validated.push({ kind: item.kind, imageUrl: parsed.toString() });
    } catch (error) {
      console.warn("source-media: dropped unreachable delivery media", {
        host: parsed.hostname,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { media: validated, oversized: false };
}
