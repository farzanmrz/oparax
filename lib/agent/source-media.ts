// Shared multimodal input shaping for the grounder and verification judge. Keeping this in one
// place guarantees both models receive the same usable source attachments, labels, and media
// types; neither model's prose description becomes the other's substitute for the original.

export type SourceMediaPart =
  | { type: "text"; text: string }
  | { type: "file"; data: URL; mediaType: string };

function imageMediaType(url: string): string | null {
  let ext: string | undefined;
  try {
    ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
  } catch (error) {
    console.error(`source-media: skipping media with unparsable url: ${url}`, error);
    return null;
  }
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export function buildSourceMediaParts(
  media: { kind: string; imageUrl: string }[],
  maxImages = 4,
): { parts: SourceMediaPart[]; attachedImageCount: number } {
  const parts: SourceMediaPart[] = [];
  let attachedImageCount = 0;

  for (const item of media.slice(0, maxImages)) {
    const mediaType = imageMediaType(item.imageUrl);
    if (mediaType === null) continue;
    let fileUrl: URL;
    try {
      fileUrl = new URL(item.imageUrl);
    } catch (error) {
      console.error(`source-media: skipping media with unparsable url: ${item.imageUrl}`, error);
      continue;
    }
    if (attachedImageCount === 0) {
      parts.push({
        type: "text",
        text: "\nATTACHED MEDIA — inspect these original source attachments directly. A video or GIF is represented by its poster frame.",
      });
    }
    parts.push({ type: "text", text: `${item.kind}:` });
    parts.push({ type: "file", data: fileUrl, mediaType });
    attachedImageCount += 1;
  }

  return { parts, attachedImageCount };
}
