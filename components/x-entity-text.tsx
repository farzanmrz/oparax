import type { ReactNode } from "react";
import twitterText from "twitter-text";

type EntityWithUnknownIndices = { indices?: unknown };

function isCodePointBoundary(text: string, index: number) {
  if (index === 0 || index === text.length) return true;
  const previous = text.charCodeAt(index - 1);
  const next = text.charCodeAt(index);
  return !(previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff);
}

function entityRanges(text: string) {
  return (twitterText.extractEntitiesWithIndices(text) as EntityWithUnknownIndices[])
    .flatMap((entity) => {
      if (!Array.isArray(entity.indices) || entity.indices.length !== 2) return [];
      const [start, end] = entity.indices;
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end <= start ||
        end > text.length ||
        !isCodePointBoundary(text, start) ||
        !isCodePointBoundary(text, end)
      ) {
        return [];
      }
      return [{ start, end }];
    })
    .sort((first, second) => first.start - second.start || first.end - second.end);
}

export function XEntityText({
  text,
  appendTrailingLineMarker = false,
}: {
  text: string;
  appendTrailingLineMarker?: boolean;
}) {
  const rendered: ReactNode[] = [];
  let cursor = 0;

  for (const { start, end } of entityRanges(text)) {
    if (start < cursor) continue;
    if (cursor < start) rendered.push(text.slice(cursor, start));
    rendered.push(
      <span className="text-primary" key={`${start}-${end}`}>
        {text.slice(start, end)}
      </span>,
    );
    cursor = end;
  }

  if (cursor < text.length) rendered.push(text.slice(cursor));
  if (appendTrailingLineMarker) rendered.push("\u200b");
  return rendered;
}
