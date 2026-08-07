// Client-safe pagination types/helpers for the Excluded tab.

export { FEED_PAGE_SIZE as EXCLUDED_PAGE_SIZE } from "@/lib/agent/feed-shared";

export type ExcludedCursor = { excludedAt: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export function canonicalExcludedCursor(value: ExcludedCursor): ExcludedCursor | null {
  const date = new Date(value.excludedAt);
  if (Number.isNaN(date.getTime()) || !UUID.test(value.id)) return null;
  return { excludedAt: date.toISOString(), id: value.id };
}

export function isExcludedCursor(
  value: ExcludedCursor | null | undefined,
): value is ExcludedCursor {
  const canonical = value && canonicalExcludedCursor(value);
  return Boolean(canonical && canonical.excludedAt === value.excludedAt);
}
