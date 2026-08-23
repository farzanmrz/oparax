/** A source is either an X author or a website publisher; publisher hostnames are provenance,
 * never X handles. */
export type SourceIdentity = { kind: "x"; handle: string } | { kind: "website"; publisher: string };

function hostnameOf(url: string | null): string {
  try {
    return url ? new URL(url).hostname.toLowerCase().replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

export function sourceIdentityOf(post: {
  source: string;
  author_handle: string | null;
  url: string | null;
}): SourceIdentity {
  return post.source === "x"
    ? { kind: "x", handle: post.author_handle ?? "" }
    : { kind: "website", publisher: hostnameOf(post.url) };
}

export function formatSourceIdentity(identity: SourceIdentity): string {
  return identity.kind === "x" ? `@${identity.handle}` : identity.publisher;
}

/** Only undo the exact model mistake of prefixing this source's own normalized hostname with @;
 * email addresses and other mentions remain untouched. */
export function normalizeWebsitePublisherMention(text: string, identity: SourceIdentity): string {
  if (identity.kind !== "website" || !identity.publisher) return text;
  const publisher = identity.publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(?<![\\p{L}\\p{N}_.-])@${publisher}(?![\\p{L}\\p{N}_.-])`, "gu"),
    identity.publisher,
  );
}
