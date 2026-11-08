/** The feed's address for a view and a source: Direct is view=articles, a pressed source is source=. */
export function feedHref(handle: string, direct: boolean, source: string | null) {
  const query = new URLSearchParams();
  if (direct) query.set("view", "articles");
  if (source) query.set("source", source);
  const rest = query.toString();
  return `/${handle}${rest ? `?${rest}` : ""}`;
}
