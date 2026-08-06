// URL-extension media-type resolution for source attachments. The drafter owns content shaping;
// this helper only classifies URLs and lets it skip one bad attachment without aborting a call.
export function resolveImageMediaType(url: string): string | null {
  let ext: string | undefined;
  try {
    ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
  } catch (error) {
    console.error(`source-media: skipping media with unparsable url: ${url}`, error);
    return null;
  }
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return null;
}
