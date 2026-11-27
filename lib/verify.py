"""Read candidate public company pages in the agent VM; pin DNS for each redirect."""
import concurrent.futures, http.client, ipaddress, json, pathlib, re, socket, ssl, sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'): self.skip+=1
        if tag=='a':
            for k,v in attrs:
                if k=='href' and v and v.lower().startswith('mailto:'): self.parts.append(v[7:].split('?')[0])
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self,s):
        if not self.skip: self.parts.append(s)

def fetch(url, resource=False):
    initial=urlsplit(url).hostname
    for _ in range(4):
        u=urlsplit(url); host=(u.hostname or '').lower().rstrip('.')
        if (resource and host!=initial) or u.scheme!='https' or u.username or u.password or u.port not in (443,None) or '.' not in host or any(host==x or host.endswith('.'+x) for x in ('linkedin.com','lnkd.in','localhost','local','internal')): raise ValueError()
        ips=[ipaddress.ip_address(r[4][0]) for r in socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)]
        if not ips or not all(ip.is_global and not ip.is_multicast and not getattr(ip,'ipv4_mapped',None) for ip in ips): raise ValueError()
        conn=http.client.HTTPSConnection(host,timeout=6)
        try:
            raw=socket.create_connection((str(ips[0]),443),timeout=6)
            conn.sock=ssl.create_default_context().wrap_socket(raw,server_hostname=host)
            conn.request('GET',(u.path or '/')+('?' + u.query if u.query else ''),headers={'User-Agent':'OparaxResearch/1.0 (+https://oparax.ai)','Accept':'text/html'})
            r=conn.getresponse()
            if r.status in (301,302,303,307,308):
                url=urljoin(url,r.getheader('location','')); continue
            mime=r.getheader('content-type','').split(';')[0].lower()
            if r.status!=200: raise ValueError()
            if resource:
                if mime not in ('text/html','text/css','image/jpeg','image/png','image/webp','image/gif'): raise ValueError()
                import base64
                return dict(mime=mime,body=base64.b64encode(r.read(900000)).decode())
            if 'html' not in mime: raise ValueError()
            p=Page();p.feed(r.read(650000).decode('utf-8','replace'));return url,' '.join(' '.join(p.parts).split())
        finally: conn.close()
    raise ValueError()

def verify(row):
    try:
        url,body=fetch(row['source']); quote=' '.join(row['quote'].split())
        if len(quote)<16 or quote.casefold() not in body.casefold(): return None
        addr=row.get('email','').strip().lower()
        if not addr or addr not in {a.lower() for a in re.findall(r'[a-zA-Z0-9.!_%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}',body)}: addr=''
        return {**row,'source':url,'email':addr}
    except Exception: return None

if __name__=='__main__':
    if sys.argv[1]=='--resource':
        print(json.dumps(fetch(sys.argv[2],True))); sys.exit(0)
    rows=json.loads(pathlib.Path(sys.argv[1]).read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: verified=[r for r in pool.map(verify,rows) if r]
    pathlib.Path('last-research.json').write_text(json.dumps(verified))
    print(json.dumps(verified))
