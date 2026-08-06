// THE one URL→media-type resolver for source attachments, shared by the drafter
// (lib/agent/draft-write.ts) and voice extraction (lib/voice/extract-guide.ts). Both carried their
// own copy of this logic until the query-string read below was added to one of them; deduping is
// what stops a future upgrade landing on one caller and not the other. One copy now.
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
