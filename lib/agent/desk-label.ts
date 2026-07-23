/**
 * A desk's display label, derived from its beat text. The site chrome's desk
 * switcher (and later the desk header itself) both need the same short
 * label, so it lives here as a pure function rather than being reimplemented
 * per component.
 * @param beat - the desk's beat text (e.g. "US AI regulation — agencies, hearings, enforcement.")
 * @returns a short label: everything before the first em-dash or period, else the
 *   first 40 characters with an ellipsis
 */
export function deriveDeskLabel(beat: string): string {
  const trimmed = beat.trim();
  const cutIndex = [trimmed.indexOf("—"), trimmed.indexOf(".")]
    .filter((index) => index !== -1)
    .sort((a, b) => a - b)[0];

  if (cutIndex !== undefined) {
    const label = trimmed.slice(0, cutIndex).trim();
    if (label) return label;
  }

  if (trimmed.length <= 40) return trimmed;
  return `${trimmed.slice(0, 40).trim()}…`;
}
