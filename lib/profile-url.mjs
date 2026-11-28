/** Return a link to an individual public profile, removing tracking parameters. */
export function linkedinProfileUrl(value) {
  if (typeof value !== 'string' || value.length > 1600) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
        !/^(?:(?:www|[a-z]{2})\.)?linkedin\.com$/i.test(url.hostname)) return '';
    const match = /^\/in\/([^/]+)(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/?$/i.exec(url.pathname);
    if (!match) return '';
    const slug = decodeURIComponent(match[1]);
    if (!/^[\p{L}\p{N}_-]{1,150}$/u.test(slug)) return '';
    return 'https://www.linkedin.com/in/' + encodeURIComponent(slug);
  } catch { return ''; }
}
