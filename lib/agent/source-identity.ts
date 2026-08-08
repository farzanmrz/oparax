/** A source is either an X author or a website publisher; publisher hostnames are provenance,
 * never X handles. */
export type SourceIdentity = { kind: "x"; handle: string } | { kind: "website"; publisher: string };

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
