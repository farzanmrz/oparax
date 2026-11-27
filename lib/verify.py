"""Check public evidence for a prospect, pinning DNS on every redirect."""
import base64
import concurrent.futures
import datetime
import http.client
import ipaddress
import json
import pathlib
import re
import socket
import ssl
import sys
import unicodedata
from html.parser import HTMLParser
from urllib.parse import quote as quote_url, urljoin, urlsplit

BLOCKS = {'p', 'div', 'br', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'section'}
HIDDEN = {'script', 'style', 'noscript', 'nav', 'aside', 'footer', 'template', 'head'}
BLOCKED_HOSTS = ('linkedin.com', 'lnkd.in', 'localhost', 'local', 'internal')
WORD = re.compile(r"[^\W_]+|&", re.UNICODE)
EMAIL = re.compile(r"(?<![\w.@+-])[\w.!%+-]+@[\w.-]+\.[a-z]{2,}(?![\w.+-])", re.I)


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.blocks = []
        self.parts = []
        self.hidden = 0
        self.date = ''

    def flush(self):
        line = ' '.join(''.join(self.parts).split())
        if line:
            self.blocks.append(line)
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        field = (attrs.get('property') or attrs.get('name') or attrs.get('itemprop') or '').lower()
        if not self.date and field in ('article:published_time', 'datepublished', 'parsely-pub-date'):
            value = attrs.get('content') or attrs.get('datetime') or ''
            try:
                self.date = datetime.date.fromisoformat(value[:10]).isoformat()
            except ValueError:
                pass
        if tag in HIDDEN:
            self.hidden += 1
        if not self.hidden and tag in BLOCKS:
            self.flush()

    def handle_endtag(self, tag):
        if tag in HIDDEN:
            self.hidden = max(0, self.hidden - 1)
        if not self.hidden and tag in BLOCKS:
            self.flush()

    def handle_data(self, value):
        if not self.hidden:
            self.parts.append(value)

    def finish(self):
        self.close()
        self.flush()
        return self


def fetch(url, resource=False):
    initial = (urlsplit(url).hostname or '').lower().rstrip('.')
    for _ in range(4):
        u = urlsplit(url)
        host = (u.hostname or '').lower().rstrip('.')
        if ((resource and host != initial) or u.scheme != 'https' or u.username is not None
                or u.password is not None or u.port not in (443, None) or '.' not in host
                or any(host == x or host.endswith('.' + x) for x in BLOCKED_HOSTS)):
            raise ValueError('Unsupported URL')
        ips = list(dict.fromkeys(ipaddress.ip_address(r[4][0])
                                for r in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)))
        if not ips or not all(ip.is_global and not ip.is_multicast and not getattr(ip, 'ipv4_mapped', None)
                              for ip in ips):
            raise ValueError('Unsupported address')
        conn = http.client.HTTPSConnection(host, timeout=6)
        try:
            for i, ip in enumerate(ips[:3]):
                try:
                    raw = socket.create_connection((str(ip), 443), timeout=4)
                    break
                except OSError:
                    if i == len(ips[:3]) - 1:
                        raise
            with raw:
                conn.sock = ssl.create_default_context().wrap_socket(raw, server_hostname=host)
                path = quote_url((u.path or '/') + ('?' + u.query if u.query else ''),
                                 safe="/%?=&;:+!$'()*,-._~@")
                conn.request('GET', path, headers={
                    'User-Agent': 'OparaxResearch/1.0 (+https://oparax.ai)',
                    'Accept': '*/*' if resource else 'text/html,application/xhtml+xml'
                })
                res = conn.getresponse()
                if res.status in (301, 302, 303, 307, 308) and res.getheader('location'):
                    url = urljoin(url, res.getheader('location'))
                    continue
                mime = res.getheader('content-type', '').split(';')[0].lower()
                if res.status != 200:
                    raise ValueError('Page unavailable')
                if resource:
                    if mime not in ('text/html', 'text/css', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'):
                        raise ValueError('Unsupported content')
                    return dict(mime=mime, body=base64.b64encode(res.read(900000)).decode())
                if 'html' not in mime:
                    raise ValueError('Source is not HTML')
                charset = res.headers.get_content_charset() or 'utf-8'
                page = Page()
                page.feed(res.read(2000000).decode(charset, 'replace'))
                return url, page.finish()
        finally:
            conn.close()
    raise ValueError('Too many redirects')


def fold(word):
    if word == '&':
        return 'and'
    return ''.join(c for c in unicodedata.normalize('NFKD', word.casefold())
                   if not unicodedata.combining(c))


def words(text):
    return [fold(m.group()) for m in WORD.finditer(text)]


def starts(values, phrase):
    return (i for i, value in enumerate(values) if value == phrase[0] and
            values[i:i + len(phrase)] == phrase) if phrase else ()


# Connectors permit press-style attributions in either order while excluding a
# second person's name between the candidate and the attributed role.
CONNECTORS = set('the a an of for at from with as s is serves serving who she he our its company brand has been appointed named promoted to new joined global group responsible current currently'.split())
PAST = re.compile(r'\b(former(?:ly)?|previous(?:ly)?|retired|ex|departing|outgoing|was|resigned|departed|late)\b', re.I)


def attribution(line, tokens, company, person, role):
    values = [fold(m.group()) for m in tokens]
    for p in starts(values, person):
        for r in starts(values, role):
            if abs(r - p) > len(role) + len(person) + 12:
                continue
            for c in starts(values, company):
                anchors = sorted([(p, p + len(person)), (r, r + len(role)), (c, c + len(company))])
                if anchors[-1][1] - anchors[0][0] > len(person) + len(role) + len(company) + 12:
                    continue
                gaps = [values[a[1]:b[0]] for a, b in zip(anchors, anchors[1:])]
                if any(len(g) > 8 or not set(g) <= CONNECTORS for g in gaps):
                    continue
                start, end = tokens[anchors[0][0]].start(), tokens[anchors[-1][1] - 1].end()
                # A sentence boundary could otherwise connect unrelated attributions.
                if any(re.search(r'[.!?]\s', line[tokens[a[1] - 1].end():tokens[b[0]].start()])
                       for a, b in zip(anchors, anchors[1:])):
                    continue
                prefix = ' '.join(values[max(0, anchors[0][0] - 4):anchors[0][0]])
                if PAST.search(prefix + ' ' + line[start:end]):
                    continue
                return start, end
    return None


def org_attribution(tokens, company, quote):
    if len(quote) < 3:
        return None
    values = [fold(m.group()) for m in tokens]
    for q in starts(values, quote):
        for c in starts(values, company):
            if c <= q + len(quote) + 12 and q <= c + len(company) + 12:
                return tokens[min(q, c)].start(), tokens[max(q + len(quote), c + len(company)) - 1].end()
    return None


def verified_email(row, evidence_line, source, anchor):
    addr = str(row.get('email') or '').strip().casefold()
    if not addr or not EMAIL.fullmatch(addr):
        return ''
    email_match = next((m for m in EMAIL.finditer(evidence_line) if m.group().casefold() == addr), None)
    if not email_match or email_match.start() < anchor[0] - 120 or email_match.end() > anchor[1] + 120:
        return ''
    person = words(row.get('person') or '')
    local, domain = addr.split('@')
    if person:
        if len(person) < 2 or len(person[-1]) < 2 or person[-1] not in ''.join(words(local)):
            return ''
        # Accept a contact adjacent to the attribution. A separate contact or sentence
        # (e.g. an editor with the same surname) is not sufficient evidence.
        gap = evidence_line[min(anchor[1], email_match.end()):max(anchor[0], email_match.start())]
        if set(words(gap)) - {'contact', 'email', 'address', 'at', 'via', 'direct', 'e', 'mail'}:
            return ''
    else:
        host = (urlsplit(source).hostname or '').lower()
        if host != domain and not host.endswith('.' + domain):
            return ''
    return addr


def verify(row):
    if not isinstance(row, dict) or not isinstance(row.get('source'), str):
        return {'status': 'unsupported'}
    try:
        url, page = fetch(row['source'])
    except (OSError, ValueError, LookupError, http.client.HTTPException):
        return {'status': 'unavailable'}
    company = words(row.get('company') or '')
    person = words(row.get('person') or '')
    role = words(row.get('role') or '')
    quote = words(row.get('quote') or '')
    if not company or (person and (len(person) < 2 or not role)):
        return {'status': 'unsupported'}
    for line in page.blocks:
        tokens = list(WORD.finditer(line))
        if person:
            match = attribution(line, tokens, company, person, role)
        else:
            match = org_attribution(tokens, company, quote)
        if not match:
            continue
        start, end = match
        evidence = line[start:end]
        lead = {**row, 'source': url, 'sourceDate': page.date, 'quote': evidence,
                'evidence': evidence, 'email': verified_email(row, line, url, match)}
        return {'status': 'verified', 'lead': lead}
    return {'status': 'unsupported'}


if __name__ == '__main__':
    if sys.argv[1] == '--resource':
        print(json.dumps(fetch(sys.argv[2], True)))
        sys.exit(0)
    rows = json.loads(pathlib.Path(sys.argv[1]).read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(verify, rows))
    pathlib.Path('last-research.json').write_text(json.dumps(results))
    print(json.dumps(results))
