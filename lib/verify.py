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
import threading
import unicodedata
from html.parser import HTMLParser
from urllib.parse import quote as quote_url, unquote, urljoin, urlsplit

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
        self.links = {}
        self.active_link = None
        self.identity_links = []
        self.catalog_labels = []
        self.catalog_entry = None
        self.org_data = []
        self.schema_text = None
        self.hidden = 0
        self.date = ''
        self.title = ''
        self.in_title = False

    def flush(self):
        line = ' '.join(''.join(self.parts).split())
        if line:
            self.blocks.append(line)
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title': self.in_title = True
        field = (attrs.get('property') or attrs.get('name') or attrs.get('itemprop') or '').lower()
        if not self.date and field in ('article:published_time', 'datepublished', 'parsely-pub-date'):
            value = attrs.get('content') or attrs.get('datetime') or ''
            try:
                self.date = datetime.date.fromisoformat(value[:10]).isoformat()
            except ValueError:
                pass
        if tag == 'a' and attrs.get('href'):
            self.identity_links.append(attrs['href'])
            self.catalog_entry = (attrs['href'],[])
        if tag == 'script' and (attrs.get('type') or '').lower() == 'application/ld+json':
            self.schema_text = []
        if tag in HIDDEN:
            self.hidden += 1
        if not self.hidden and tag in BLOCKS:
            self.flush()
        if not self.hidden and tag == 'a':
            self.active_link = (attrs.get('href') or '', [])

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script' and self.schema_text is not None:
            try:
                graph = json.loads(''.join(self.schema_text))
                nodes = graph if isinstance(graph, list) else [graph]
                for obj in nodes:
                    if not isinstance(obj, dict):
                        continue
                    for info in [obj, *(obj.get('@graph') or [])]:
                        if isinstance(info, dict) and info.get('@type') in ('Organization','Corporation'):
                            self.org_data.append(info)
            except (ValueError, TypeError):
                pass
            self.schema_text = None
        if tag == 'a' and self.catalog_entry:
            href, chunks = self.catalog_entry
            self.catalog_labels.append((href,' '.join(''.join(chunks).split())[:120]))
            self.catalog_entry = None
        if tag == 'a' and self.active_link:
            href, pieces = self.active_link
            self.links.setdefault(len(self.blocks), []).append((href, ' '.join(''.join(pieces).split())))
            self.active_link = None
        if tag in HIDDEN:
            self.hidden = max(0, self.hidden - 1)
        if not self.hidden and tag in BLOCKS:
            self.flush()

    def handle_data(self, value):
        if self.in_title: self.title = (self.title + value)[:600]
        if self.catalog_entry: self.catalog_entry[1].append(value)
        if self.schema_text is not None and len(value) <= 140000:
            self.schema_text.append(value)
        if not self.hidden:
            self.parts.append(value)
            if self.active_link:
                self.active_link[1].append(value)

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
CONNECTORS = set('the a an of for at from with as s is serves serving who she he our its company brand has been appointed named promoted to new joined global group responsible current currently en de del la el para como es actual'.split())
PAST = re.compile(r'\b(former(?:ly)?|previous(?:ly)?|retired|ex|departing|outgoing|was|resigned|departed|late|antes|anteriormente|trabajaba|trabajó|trabajé|fui|fue)\b', re.I)


def company_starts(line, tokens, values, company, industry_words=()):
    for pos in starts(values, company):
        end = pos + len(company)
        # Name prefixes such as “Barbour” in “Barbour Engineering” don't identify the employer.
        if end < len(tokens) and line[tokens[end-1].end():tokens[end].start()].isspace():
            qualifier = tokens[end].group()
            if qualifier[0].isupper() and fold(qualifier) not in industry_words and fold(qualifier) not in {
                    'director', 'head', 'manager', 'chair', 'vice', 'president', 'ceo', 'cfo', 'chief',
                    'designer', 'buyer', 'limited', 'ltd', 'inc', 'plc', 'llc'}:
                continue
        yield pos


def attribution(line, tokens, company, person, role):
    values = [fold(m.group()) for m in tokens]
    for p in starts(values, person):
        for r in starts(values, role):
            if abs(r - p) > len(role) + len(person) + 12:
                continue
            for c in company_starts(line, tokens, values, company):
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


def role_category_evidence(role, target, trailing=''):
    """Require the category in the attributed title or its subject's present duties."""
    terms = [words(t) for t in target.get('roleCategoryTerms') or [] if isinstance(t, str) and t.strip()]
    if not terms or any(tuple(starts(role, term)) for term in terms):
        return ''
    # The matched attribution ends immediately before this phrase. Bounded grammar
    # excludes a second person's role, the employer's catalog and past experience.
    duty = re.match(r"^[ ,]*(?:who\s+)?(?:(?:is\s+)?responsible for|oversees|leads|manages|handles|"
                    r"runs|heads|speciali[sz]es in|is in charge of)\s+", trailing, re.I)
    if not duty:
        return None
    tokens = list(WORD.finditer(trailing[duty.end():]))
    allowed = set("sourcing supply chain buying procurement purchasing design production development "
                  "the all of for in its men s women kids and children product category department line".split())
    values = [fold(m.group()) for m in tokens]
    for term in terms:
        for pos in starts(values[:12], term):
            if pos > 7 or not set(values[:pos]) <= allowed:
                continue
            end = duty.end() + tokens[pos+len(term)-1].end()
            if not re.search(r'[.;:!?|]',trailing[:end]):
                return trailing[:end]
    return None


def org_attribution(line, tokens, company, quote):
    if len(quote) < 3:
        return None
    values = [fold(m.group()) for m in tokens]
    for q in starts(values, quote):
        for c in company_starts(line, tokens, values, company):
            if c <= q + len(quote) + 12 and q <= c + len(company) + 12:
                return tokens[min(q, c)].start(), tokens[max(q + len(quote), c + len(company)) - 1].end()
    return None


def matches_domain(url, domain):
    try:
        u = urlsplit(url)
        host = (u.hostname or '').casefold().rstrip('.')
        return (u.scheme in ('http', 'https') and u.username is None and u.password is None
                and (host == domain or host.endswith('.' + domain)))
    except ValueError:
        return False


def company_verification(page, index, url, name, target, attribution_text):
    company = words(name)
    wanted = words(target.get('company') or '')
    if wanted and company != wanted:
        return None
    evidence = {'name': name, 'source': url, 'evidence': attribution_text}
    domain = (target.get('domain') or '').lower().rstrip('.')
    nearby = sorted(range(max(0, index - 3), min(len(page.blocks), index + 4)),
                    key=lambda i: abs(i - index))
    if domain:
        if matches_domain(url, domain):
            return dict(evidence, domain=domain)
        for i in nearby:
            for href, label in page.links.get(i, ()):
                # The visible link itself must identify this company, not an unrelated sponsor.
                if words(label) in (company, company + ['website']) and matches_domain(urljoin(url, href), domain):
                    return dict(evidence, domain=domain,
                                evidence=attribution_text + ' · ' + label + ' → ' + domain)
        return None
    terms = [words(t) for t in [target.get('industry'), *(target.get('industryTerms') or [])]
             if isinstance(t, str) and t.strip()]
    if not terms or any(list(starts(words(attribution_text), term)) for term in terms):
        return evidence

    # Only a nearby clause describing what this employer does counts. E.g. a citation
    # elsewhere on the page to a footwear customer does not make the employer a shoe brand.
    relation = set(('the a an s is as of for its own new british global heritage independent luxury retailer manufacturer '
                    'producer designer brand company specialist label designs makes manufactures produces sells supplies '
                    'imports sources launches launched unveils unveiled develops latest first ever premium mens womens men '
                    'women children line range collection collections releases released handmade leather handcrafted durable '
                    'in outdoor lifestyle and').split())
    for i in nearby:
        for clause in re.split(r'[.!?;]|\s[–—]\s', page.blocks[i]):
            tokens = list(WORD.finditer(clause))
            values = [fold(m.group()) for m in tokens]
            for c in company_starts(clause, tokens, values, company, {t[0] for t in terms if t}):
                for term in terms:
                    for j in starts(values, term):
                        lo, hi = sorted([(c, c + len(company)), (j, j + len(term))])
                        gap = values[lo[1]:hi[0]]
                        if len(gap) > 7 or not set(gap) <= relation:
                            continue
                        start, end = tokens[lo[0]].start(), tokens[hi[1] - 1].end()
                        if len(clause[start:end]) > 220:
                            continue
                        return dict(evidence, evidence=clause[start:end])
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


def catalog_label_from_path(url, terms):
    path_words = words(unquote(urlsplit(url).path))
    return any(tuple(starts(path_words,term)) for term in terms)


def company_anchor(page, url, row):
    """A shared corporate page can establish employer identity but cannot identify a person."""
    target = row.get('researchTarget') or {}
    name = row.get('company') or ''
    if not words(name) or not (target.get('industry') or target.get('domain')):
        return None
    industry_words = {term[0] for term in [words(t) for t in [target.get('industry') or '',*(target.get('industryTerms') or [])]] if term}
    domain = official_domain(url,name,target)
    if page.title and domain:
        # On first-party stores the category name and brand are often separate title
        # segments, or the brand is in the title and the category in storefront links.
        title_parts = re.split(r'\s*[|·]\s*|\s+[–—-]\s+', page.title)
        terms = [words(t) for t in [target.get('industry'),*(target.get('industryTerms') or [])] if t]
        brand = words(name)
        on_category_path = catalog_label_from_path(url,terms)
        branded = any(words(part)==brand or (on_category_path and words(part)[:len(brand)]==brand)
                      for part in title_parts)
        def catalog_label(label):
            label_words = [word for word in words(label) if not re.fullmatch(r'(?:19|20)[0-9]{2}',word)]
            qualifiers = {'men','mens','women','womens','s','for','all','kids','leather','online',
                          'collection','collections','de','mujer','hombre','piel'}
            return any(any(set(label_words[:pos]+label_words[pos+len(term):]) <= qualifiers
                           for pos in starts(label_words,term)) for term in terms)
        if branded and terms:
            if any(catalog_label(part) for part in title_parts if words(part)!=words(name)):
                return {'name':name,'source':url,'evidence':page.title,'domain':domain}
            for href,label in page.catalog_labels:
                dest=urljoin(url,href)
                if label and matches_domain(dest,domain) and catalog_label(label) and catalog_label_from_path(dest,terms):
                    return {'name':name,'source':url,'evidence':page.title+' · '+label+' → '+dest,'domain':domain}
        doc_title = Page()
        doc_title.blocks = [page.title]
        if tuple(starts(words(page.title),words(name))):
            proof = company_verification(doc_title,0,url,name,target,name)
            if proof:
                return {**proof, 'domain':domain}
    for i, line in enumerate(page.blocks):
        tokens = list(WORD.finditer(line))
        values = [fold(m.group()) for m in tokens]
        for start in company_starts(line, tokens, values, words(name), industry_words):
            end = start + len(words(name)) - 1
            visible = line[tokens[start].start():tokens[end].end()]
            proof = company_verification(page, i, url, name, target, visible)
            if proof:
                return {**proof,'domain':domain} if domain else proof
    return None


def profile_url(raw):
    try:
        url = urlsplit(raw)
        if (url.scheme != 'https' or url.port not in (443, None) or url.username is not None
                or url.password is not None or not re.fullmatch(r'(?:(?:www|[a-z]{2})\.)?linkedin\.com', url.hostname or '')):
            return ''
        slug = re.fullmatch(r'/in/([^/]+)/?', url.path)
        if slug:
            slug = unquote(slug[1])
            if re.fullmatch(r'[\w-]{1,150}', slug):
                return 'https://www.linkedin.com/in/' + quote_url(slug, safe='-_')
    except (TypeError, ValueError):
        pass
    return ''


PAST_INDEX = re.compile(r'\b(?:former(?:ly)?|previous(?:ly)?|worked|interned|departed|retired|past|anterior(?:mente)?|antes|trabajaba|trabajó|trabajé|fui|fue|hasta (?:19|20)\d{2}|ex[- ])\b|'
                        r'(?:19|20)\d\d\s*[-–—]\s*(?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d\d|'
                        r'can introduce|people working at|mutual connections', re.I)


def official_domain(url, company, target):
    host = (urlsplit(url).hostname or '').lower().removeprefix('www.')
    explicit = (target.get('domain') or '').lower().removeprefix('www.')
    if explicit and matches_domain(url, explicit):
        return explicit
    # For an inferred first-party anchor the brand must be the registrable label. Requiring
    # a whole host pattern also excludes a similarly named subdomain on a third-party site.
    parts = host.split('.')
    if len(parts) >= 3 and parts[0] in ('shop','store','about','corporate','company'):
        parts = parts[1:]
    brand = ''.join(words(company))
    if (len(parts) == 2 or (len(parts) == 3 and parts[1] in ('co','com','org') and len(parts[2]) == 2)):
        if parts[0].replace('-', '') == brand:
            return '.'.join(parts)
    return ''


def org_url(value):
    try:
        u = urlsplit(value)
        if ((u.hostname or '').lower() not in ('linkedin.com', 'www.linkedin.com', 'uk.linkedin.com')
                or u.username is not None or u.password is not None or u.port not in (443, None)):
            return ''
        slug = re.fullmatch(r'/company/([^/]+)/?', u.path)
        return 'linkedin.com/company/' + unquote(slug[1]).casefold() if slug else ''
    except (ValueError, TypeError):
        return ''


# Product categories must actually appear on the employer's site; a retail title
# like "buyer" on its own supplies no such identity evidence.
PRODUCT_AREAS = {
    'womenswear': r"\bwomenswear\b|\bwomen(?:'s|’s|s)? (?:clothing|apparel|collection|jackets|outerwear)\b",
    'menswear': r"\bmenswear\b|\bmen(?:'s|’s|s)? (?:clothing|apparel|collection|jackets|outerwear)\b",
    'outerwear': r'\bouterwear\b', 'knitwear': r'\bknitwear\b', 'footwear': r'\bfootwear\b',
    'sportswear':r'\bsportswear\b', 'leather goods':r'\bleather goods\b',
}
SOCIAL = re.compile(r"\b(?:hiring|jobs?|vacanc(?:y|ies)|recruiting|recruitment|apply now|job openings?|"
                    r"opening for|open position|position (?:is )?(?:available|open)|exciting opportunity|"
                    r"opportunity (?:to join|for a)|shared this|reposted|reacted (?:to|on)|liked this|"
                    r"oferta de (?:empleo|trabajo)|vacantes?|buscamos|estamos contratando|recomiendo a|recomendaciones|recomienda a|recomendó a|compartió|(?:posted|posts?) (?:about|by)|join our team|we(?:’re|'re| are) looking for)\b",re.I)

def identity_match(context, markers):
    for kind,value,origin in markers:
        if kind == 'domain':
            found = re.search(r'(?<![a-z0-9.-])(?:www\.)?'+re.escape(value)+r'(?![a-z0-9.-])',context,re.I)
        elif kind == 'company_url':
            linked = re.findall(r'(?:https?://)?(?:(?:[a-z]{2}|www)\.)?linkedin\.com/company/[^\s?&#|,;)]+',context,re.I)
            found = any(org_url(link if '://' in link else 'https://'+link)==value for link in linked)
        elif kind == 'product_area':
            found = re.search(PRODUCT_AREAS[value], context, re.I)
        else:
            found = tuple(starts(words(context),words(value)))
        if found:
            return {'matchType':kind,'identityEvidence':value,'identitySource':origin}
    return None


def identity_markers(page, url, company, target, read_page, extra=True):
    domain = official_domain(url, company, target)
    if not domain:
        return []
    markers = [('domain', domain, url)]
    for href in page.identity_links:
        identity = org_url(urljoin(url, href))
        if identity:
            markers.append(('company_url',identity,url))
    areas = {}
    for href,label in page.catalog_labels:
        link=urljoin(url,href)
        if not label or not matches_domain(link,domain):
            continue
        path = unquote(urlsplit(link).path).casefold()
        taxonomy = re.sub(r"[^a-z]+",' ',path)
        for category, pattern in PRODUCT_AREAS.items():
            if re.search(pattern,label,re.I): areas.setdefault(category,link)
        # Many stores label the link simply "Clothing" underneath a gender-specific
        # menu. The official category URL and its visible label ground the category.
        if re.search(r'\b(?:clothing|jackets?|coats?)\b',label,re.I):
            if re.search(r'\bwomens? (?:clothing|jackets?|coats?)\b',taxonomy):
                areas.setdefault('womenswear',link)
            if re.search(r'\bmens? (?:clothing|jackets?|coats?)\b',taxonomy):
                areas.setdefault('menswear',link)
        if re.search(r'\b(?:jackets?|coats?)\b',label,re.I) and re.search(r'\b(?:jackets?|coats?)\b',taxonomy):
            areas.setdefault('outerwear',link)
    markers.extend(('product_area',category,origin) for category,origin in areas.items())
    company_tokens = words(company)
    for obj in page.org_data:
        if not tuple(starts(words(str(obj.get('name') or '')),company_tokens)):
            continue
        if obj.get('url') and not matches_domain(str(obj['url']),domain):
            continue
        legal_name = obj.get('legalName')
        if isinstance(legal_name,str) and words(legal_name) != company_tokens and tuple(starts(words(legal_name),company_tokens)):
            markers.append(('legal_name',legal_name,url))
        address = obj.get('address')
        if isinstance(address,dict) and isinstance(address.get('addressLocality'),str):
            markers.append(('location',address['addressLocality'],url))
        for link in obj.get('sameAs') or []:
            if isinstance(link,str) and org_url(link):
                markers.append(('company_url',org_url(link),url))
    lines = page.blocks
    legal = re.compile(r'(?:trading (?:name|style) of|registered (?:name|company name) is|owned (?:and operated )?by|operated by)\s+([\w&. -]{3,85}?\b(?:Ltd\.?|Limited|LLC|Inc\.?|plc))\b',re.I)
    hq = re.compile(r'(?:headquartered|headquarters|head office|main office|registered office|based)[, ]+?(?:(?:is|are|located|remains) )*(?:in|at)\s+(.{3,145})',re.I)
    for line in lines:
        for match in legal.finditer(line):
            if tuple(starts(words(match[1]),company_tokens)):
                markers.append(('legal_name',match[1].strip(),url))
        for match in hq.finditer(line):
            prefix = re.split(r'[.!?;]',line[max(0,match.start()-100):match.start()])[-1]
            if not (tuple(starts(words(prefix),company_tokens)) or re.search(
                    r"\b(?:our|we are|we're|company(?:'s|’s)?|corporate)\s*$", prefix, re.I)):
                continue
            address = re.split(r'[.;!]|\s[–—]\s',match[1])[0].split(',')
            for piece in address[:2]:
                city = re.split(r'\s(?:is|where|remains|and|in|which|was)\s',piece.strip(),maxsplit=1)[0]
                if (re.fullmatch(r'[A-Z][a-z]+(?:[ -][A-Z][a-z]+){0,2}',city)
                        and not re.search(r'\b(?:Estate|Park|Lane|Road|Avenue|Street|Square|Court|Building|Drive|London|Washington|England|Scotland|Wales|Ireland|Kingdom|States)\b',city)):
                    markers.append(('location',city,url))
    if extra and not any(t in ('location','legal_name') for t,_,_ in markers):
        candidates = []
        for href in page.identity_links:
            link = urljoin(url, href)
            if not matches_domain(link,domain) or link == url:
                continue
            path = urlsplit(link).path.lower()
            if any(x in path for x in ('terms-of-use','terms-and-conditions','terms_of_use')):
                candidates.append((0,link))
            elif any(x in path for x in ('about-us','our-history','about/company','company-information')):
                candidates.append((1,link))
        # Regional legal pages sometimes identify a local subsidiary. Try one legal page
        # and one company information page, always on the already corroborated domain.
        for priority in (0,1):
            choices = [link for rank,link in candidates if rank==priority]
            if not choices: continue
            try:
                final, context_page = read_page(min(choices))
                if matches_domain(final,domain):
                    markers.extend(identity_markers(context_page,final,company,target,read_page,False))
            except (OSError, ValueError, LookupError, http.client.HTTPException):
                continue
    return markers


def bullet_experience(snippet):
    """Read explicitly dated role-first entries without crossing the next job boundary."""
    section = re.search(r'(?:^|\n)#{1,4}\s+Experience\s*\n(.+?)(?=\n#{1,3}\s+[A-Za-z]|$)',snippet,re.I|re.S)
    if not section:
        return []
    records = []
    # For this format the job is a bullet and the employer is its own bold field.
    for block in re.split(r'(?m)^\s*[-*]\s+(?=\*\*)',section[1])[1:]:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines)<3:
            continue
        title = re.fullmatch(r'\*\*([^*\n]+)\*\*',lines[0])
        firm = re.fullmatch(r'\*\*([^*\n]+)\*\*',lines[1])
        dated = re.match(r'^(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2}\s*[-–—]\s*'
                         r'(?P<end>present|current|(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2})\b',lines[2],re.I)
        if not (title and firm and dated):
            continue
        detail=lines[:3]
        if len(lines)>3 and re.fullmatch(r"[\w .’'-]+(?:,\s*[\w .’'-]+){1,3}",lines[3]):
            detail.append(lines[3])
        records.append((words(title[1]),words(firm[1]),dated['end'].lower() in ('present','current'),
                        '\n'.join(detail)))
    return records


def current_markdown_experience(snippet,role,companies):
    section = re.search(r'(?:^|\n)#{1,3}\s+Experience\s*\n(.+?)(?=\n#{1,2}\s+[A-Za-z]|$)',snippet,re.I|re.S)
    if not section:
        return ''
    lines = [l.strip(' *\t') for l in section[1].splitlines() if l.strip(' *\t')]
    for i,line in enumerate(lines[:25]):
        employer = re.search(r'\[([^]\n]+)\]\(https://(?:[a-z]{2}\.|www\.)?linkedin\.com/company/[^)]+\)',line,re.I)
        if not employer or words(employer[1]) not in companies:
            continue
        job, block = False, [line]
        for entry in lines[i+1:i+8]:
            if re.search(r'\]\(https?://[^)]+/company/',entry,re.I): break
            clean = entry.lstrip('# ').strip()
            if entry.startswith('#') and clean:
                if job or not tuple(starts(words(clean),role)): break
                job = True
            block.append(entry)
            if re.search(r'(?:19|20)\d{2}\s*[–—-]\s*(?:Present|Current)\b',entry,re.I) and job:
                return '\n'.join(block)
            if PAST_INDEX.search(entry): break
    return ''


def indexed_employment(row, markers=()):
    hit = row.get('profileHit')
    if not isinstance(hit, dict):
        return None
    url = profile_url(hit.get('url'))
    title, snippet = str(hit.get('title') or '')[:400], str(hit.get('snippet') or '')[:12000]
    parts = re.split(r'\s+[–—-]\s+|\s*\|\s*', title)
    name, role, company = words(row.get('person') or ''), words(row.get('role') or ''), words(row.get('company') or '')
    if not url or len(name) < 2 or not company or not role:
        return None
    title_name = words(parts[0])
    if title_name != name and not (len(name) == 2 and 2 < len(title_name) <= 4 and
                                    name[0] == title_name[0] and name[-1] == title_name[-1]):
        return None
    headline = ' - '.join(p for p in parts[1:] if words(p) != ['linkedin']).strip()
    # Don't resurrect an older job from the snippet if the headline names a different employer.
    declared = re.search(r'\s(?:at|@|en)\s+([^|·–—]+)', headline, re.I)
    if declared:
        employer = words(declared[1].split(',')[0])
        aliases = [words(v) for t,v,_ in markers if t=='legal_name']
        if employer not in [company,*aliases] and not (
                employer[:len(company)]==company and set(employer[len(company):]) <= {'inc','ltd','limited','llc','plc'}):
            return None
        if not tuple(starts(words(headline[:declared.start()]),role)):
            return None
    if PAST_INDEX.search(headline):
        return None
    for part in parts[1:]:
        named = words(part)
        if named[:len(company)] == company and len(named)>len(company):
            suffix = named[len(company):]
            if (not set(suffix)<={'inc','ltd','limited','llc','plc'} and not tuple(starts(suffix,role))
                    and named not in [words(v) for t,v,_ in markers if t=='legal_name']):
                return None
    # A title that lists only another company is also an explicit conflicting affiliation.
    if (headline and not tuple(starts(words(headline), company)) and
            not tuple(starts(words(headline), role)) and not declared):
        return None

    target = row.get('researchTarget') or {}
    scoped_title = role_category_evidence(role, target) is not None
    industry = [words(t) for t in [target.get('industry'), *(target.get('industryTerms') or [])] if t]
    domain = (target.get('domain') or '').casefold()
    # Each piece is independently attributable. A following former position or unrelated
    # role buried in the person's history may not supply missing employment proof.
    companies = [company]+[words(v) for kind,v,_ in markers if kind=='legal_name']
    current_records = bullet_experience(snippet)
    if current_records:
        for current_role,employer,present,description in current_records:
            if not present or employer not in companies or current_role!=role or SOCIAL.search(description):
                continue
            proof = identity_match(description,markers)
            if scoped_title and (proof or any(tuple(starts(role,t)) for t in industry if t)):
                return {'linkedinUrl':url,'linkedinEvidence':(title+' · '+description)[:650],'bridge':proof}
        # An explicit current or dated position overrides boilerplate skill or About text.
        return None
    precise_job = current_markdown_experience(snippet,role,companies)
    if precise_job and not SOCIAL.search(precise_job):
        proof = identity_match(precise_job,markers)
        if scoped_title and (proof or any(tuple(starts(role,t)) for t in industry if t)):
            return {'linkedinUrl':url,'linkedinEvidence':(title+' · '+precise_job)[:650],'bridge':proof}
    about = re.search(r'(?:^|\n)\s*#*\s*About\s*\n(.{2,420}?)(?:\n\s*#|$)',snippet,re.I|re.S)
    # A result snippet can be text from a shared job advert rather than the profile owner.
    # Only a separate self-authored About section or an explicit professional headline
    # can survive Activity/post/job markers, never an excerpt from that listing.
    contaminated = SOCIAL.search(snippet) or re.search(r'(?:^|\n)\s*#+\s*Activity\b',snippet,re.I)
    if contaminated:
        snippet = about[1].strip() if about and not SOCIAL.search(about[1]) else ''
    # Some indexes expose the profile summary and present employer as distinct metadata
    # fields in one record. Check exact title employer, role, and field order rather
    # than joining arbitrary occurrences of a name and role in a search snippet.
    employers = [company] + [words(v) for k,v,_ in markers if k=='legal_name']
    headline_company = any(words(headline)==e for e in employers)
    if headline_company and not PAST_INDEX.search(snippet):
        block = re.search(r'(?:^|\s[·|]\s|\bAbout\s*[:·]\s*)([^·|\n]{2,220})\s*[·|]\s*'
                          r'(?:Experience|Experiencia)\s*:\s*([^·|\n]{2,130})(?:\s*[·|]\s*(?:Location\s*:\s*)?([^·|\n]{2,90}))?',snippet,re.I)
        own_role = block[1].strip() if block else ''
        current_employer = (block[2].split(',')[0].strip(' .') if block else '')
        valid_pair = (block and words(current_employer) in employers and tuple(starts(words(own_role), role))
                       and not re.search(r'\b(?:seeking|previous|former|aspiring|graduate looking|anterior|anteriormente|buscando)\b',own_role,re.I)
                       and not re.search(r'\b(?:education|former|previous)\b',block[3] or '',re.I))
        own = re.match(r'(?:(?:about|i am|i work as)[: ]+)?(?:[a-z -]{0,40} )?'+
                       r'\b'+r'\s+'.join(map(re.escape,role))+
                       r'\b\s+(?:speciali[sz]ing in|responsible for|with experience in)\s+[^·|.]{2,80}',snippet,re.I)
        if valid_pair or own:
            ev = (block[0].strip(' ·|') if valid_pair else own[0]).strip()
            proof = identity_match(ev,markers)
            scope_role = words(re.split(r'\b(?:with (?:experience|a background)|background in|con experiencia|anteriormente)\b', own_role, flags=re.I)[0]) if valid_pair else role
            if role_category_evidence(scope_role,target) is not None and (
                    proof or any(tuple(starts(words(ev),term)) for term in industry if term)):
                return {'linkedinUrl':url,'linkedinEvidence':(title+' · '+ev)[:650],'bridge':proof}
    segments = [headline] + re.split(r'(?<=[.!?])\s+|(?:\s+[·|]\s+)|\n+', snippet)
    usable = []
    for j, seg in enumerate(segments):
        if not seg or len(seg)>380 or PAST_INDEX.search(seg):
            continue
        following = segments[j+1] if j+1 < len(segments) else ''
        if j and re.match(r'^(?:[A-Za-z]{3,9} )?(?:19|20)\d{2}',following.strip()) and PAST_INDEX.search(following):
            continue
        usable.append(seg)
    local = Page()
    local.blocks = usable
    for i, segment in enumerate(usable):
        if not segment or PAST_INDEX.search(segment) or len(segment) > 380:
            continue
        tokens = list(WORD.finditer(segment))
        values = [fold(m.group()) for m in tokens]
        aliases = [company] + [words(value) for kind,value,_ in markers if kind=='legal_name']
        employers = [(pos,alias) for alias in aliases for pos in company_starts(segment,tokens,values,alias)]
        for position, alias in employers:
            after = position + len(alias)
            if after < len(tokens) and segment[tokens[after-1].end():tokens[after].start()].isspace():
                allowed = {*CONNECTORS, 'inc','ltd','limited','llc','plc','http','https','based','in','since','where','working'}
                if values[after] not in allowed and not tuple(starts(values[after:after+len(role)],role)):
                    continue
            for r in starts(values, role):
                left, right = sorted([(r, r + len(role)), (position, position + len(alias))])
                gap = values[left[1]:right[0]]
                if len(gap) > 5 or not set(gap) <= CONNECTORS:
                    continue
                # “Graphic Designer Barbour, South Shields” is also how LinkedIn displays
                # a job card. A bare juxtaposition in an activity snippet is insufficient.
                if segment!=headline and not gap and not re.search(r'\b(?:current role|experience|i am|experiencia|actualmente|soy)\b',segment,re.I):
                    continue
                sector_in_role = any(tuple(starts(role, term)) for term in industry if term)
                # If the role itself is generic, require an explicit industry descriptor
                # for THIS employer in the same index snippet, or the requested domain.
                company_proof = None
                if industry and not sector_in_role:
                    company_proof = company_verification(local, i, url, row['company'],
                                                         {**target, 'domain': ''}, row['company'])
                domain_in_segment = bool(domain and re.search(
                    r'(?<![a-z0-9.-])(?:www\.)?' + re.escape(domain) + r'(?![a-z0-9.-])',
                    segment.casefold()))
                bridge = None
                # Each separate location/company identifier must be in the same employment
                # snippet or the profile headline. Never reuse other work-history entries.
                context = headline+' · '+segment
                bridge = identity_match(context,markers)
                if not (sector_in_role or company_proof or domain_in_segment or bridge):
                    continue
                tail = segment[tokens[right[1]-1].end():]
                if role_category_evidence(role, target, tail) is None:
                    continue
                evidence = title if segment == headline else title + ' · ' + segment.strip()
                return {'linkedinUrl': url, 'linkedinEvidence': evidence[:650], 'bridge':bridge}
    return None


def coalesced_fetch():
    """Share each pinned fetch among concurrent candidates from the same public page."""
    lock, fetched = threading.Lock(), {}
    def read_page(url):
        with lock:
            owner = url not in fetched
            if owner:
                fetched[url] = concurrent.futures.Future()
            result = fetched[url]
        if owner:
            try:
                result.set_result(fetch(url))
            except Exception as error:
                result.set_exception(error)
        return result.result()
    return read_page

def verify(row, read_page=None):
    if not isinstance(row, dict) or not isinstance(row.get('source'), str):
        return {'status': 'unsupported'}
    try:
        url, page = (read_page or fetch)(row['source'])
    except (OSError, ValueError, LookupError, http.client.HTTPException):
        return {'status': 'unavailable'}
    if row.get('kind') == 'company':
        proof = company_anchor(page, url, row)
        if not proof:
            return {'status': 'unsupported'}
        identity = identity_markers(page,url,row['company'],row.get('researchTarget') or {},read_page or fetch)
        proof['identifiers'] = [{'kind':kind,'value':value,'source':origin} for kind,value,origin in
                                dict.fromkeys(identity) if kind in ('legal_name','location','company_url','domain')][:20]
        return {'status': 'verified', 'lead': {'company': row['company'], 'source': url,
                                               'evidence': proof['evidence'], 'companyVerification': proof}}
    company = words(row.get('company') or '')
    person = words(row.get('person') or '')
    role = words(row.get('role') or '')
    quote = words(row.get('quote') or '')
    if not company or (person and (len(person) < 2 or not role)):
        return {'status': 'unsupported'}
    for index, line in enumerate(page.blocks):
        tokens = list(WORD.finditer(line))
        if person:
            match = attribution(line, tokens, company, person, role)
        else:
            match = org_attribution(line, tokens, company, quote)
        if not match:
            continue
        start, end = match
        evidence = line[start:end]
        if person:
            duty = role_category_evidence(role, row.get('researchTarget') or {}, line[end:])
            if duty is None:
                continue
            evidence += duty
        company_proof = company_verification(page, index, url, row['company'],
                                             row.get('researchTarget') or {}, evidence)
        if not company_proof and row.get('companySource') and row['companySource']!=url:
            try:
                author_url, author_page = (read_page or fetch)(row['companySource'])
                target = row.get('researchTarget') or {}
                authority = company_anchor(author_page,author_url,row)
                if authority and official_domain(author_url,row['company'],target):
                    markers = identity_markers(author_page,author_url,row['company'],target,read_page or fetch)
                    link = identity_match(evidence,markers)
                    if link:
                        company_proof = {**authority,**link}
            except (OSError,ValueError,LookupError,http.client.HTTPException):
                pass
        if not company_proof:
            continue
        lead = {**row, 'source': url, 'sourceDate': page.date, 'quote': evidence,
                'evidence': evidence, 'companyVerification': company_proof, 'email': verified_email(row, line, url, match)}
        return {'status': 'verified', 'lead': lead}
    if row.get('kind') == 'profile' and row.get('profileHit'):
        proof = company_anchor(page, url, row)
        if not proof:
            return {'status':'unsupported'}
        markers = identity_markers(page,url,row.get('company') or '',row.get('researchTarget') or {},read_page or fetch)
        profile = indexed_employment(row,markers)
        if profile:
            bridge = profile.pop('bridge',None)
            if bridge:
                proof = {**proof,**bridge}
            evidence = 'Public LinkedIn index · ' + profile['linkedinEvidence']
            fit = (row['role'] + ' at ' + row['company'] + ' according to the public profile index. '
                   'The company source corroborates the employer identity.')
            return {'status': 'verified', 'lead': {**row, **profile, 'source': url, 'sourceDate': '',
                        'companyVerification': proof, 'evidence': evidence, 'quote': evidence, 'fit': fit,
                        'email': '', 'verificationSource': 'profile_index'}}
    return {'status': 'unsupported'}


if __name__ == '__main__':
    if sys.argv[1] == '--resource':
        print(json.dumps(fetch(sys.argv[2], True)))
        sys.exit(0)
    rows = json.loads(pathlib.Path(sys.argv[1]).read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        read_page = coalesced_fetch()
        results = list(pool.map(lambda row: verify(row, read_page), rows))
    pathlib.Path('last-research.json').write_text(json.dumps(results))
    print(json.dumps(results))
