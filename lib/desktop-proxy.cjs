'use strict';
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

const cookieName = '__Host-oparax-desktop';
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const lifetime = 15 * 60_000;
const defaultPage = '/vnc.html?autoconnect=1&resize=scale&path=desktop/socket';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (a,b) => typeof a==='string' && typeof b==='string' && a.length===b.length &&
  Buffer.byteLength(a)===Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const welcome = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oparax private desktop</title><main><h1>Oparax private desktop</h1><p id="status" role="status">Opening your agent computer…</p></main><script src="/welcome.js"></script></html>';
const redeemScript = `(async()=>{const nonce=location.hash.slice(1);history.replaceState(null,'','/');try{if(nonce){const res=await fetch('/redeem',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'text/plain'},body:nonce});if(!res.ok)throw Error();}else{const res=await fetch('/session',{credentials:'same-origin',cache:'no-store'});if(!res.ok)throw Error();}location.replace(${JSON.stringify(defaultPage)});}catch{document.getElementById('status').textContent='This private link is unavailable or has expired. Return to your agent and open a fresh link.';}})();`;

function createGateway({origin, stateDir, clock=Date.now, duration=lifetime, webRoot='/usr/share/novnc', wsModule, rfbPort=5900}) {
  const expected = new URL(origin);
  if (expected.protocol !== 'https:' || origin !== expected.origin || expected.username || expected.password) throw Error('Invalid desktop origin');
  const grantPath = path.join(stateDir,'desktop-grant.json');
  const openedPath = path.join(stateDir,'desktop-opened');
  let epoch = null;
  const headers = {
    'cache-control':'no-store, private, max-age=0',
    'referrer-policy':'no-referrer',
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY',
    'content-security-policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' wss://" + expected.host + "; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  };
  function closeSession() {
    if (!epoch) return;
    clearTimeout(epoch.timer);
    for (const socket of epoch.sockets) socket.destroy();
    epoch = null;
  }
  function authenticate(cookie) {
    if (!epoch || epoch.until <= clock()) { closeSession(); return false; }
    const fields = (cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));
    if (fields.length !== 1) return false;
    const value = fields[0].slice(cookieName.length+1);
    return tokenPattern.test(value) && same(digest(value),epoch.digest);
  }
  function redeem(value) {
    if (!tokenPattern.test(value)) return null;
    const supplied = digest(value);
    function valid(data) {
      return Number.isSafeInteger(data.expiresAt) && data.expiresAt>clock() && data.expiresAt<=clock()+95_000 &&
        /^[a-f0-9]{64}$/.test(data.digest) && same(supplied,data.digest);
    }
    try {
      if (!valid(JSON.parse(fs.readFileSync(grantPath,'utf8')))) return null;
      const claim = path.join(stateDir,'used-'+crypto.randomUUID());
      fs.renameSync(grantPath,claim);
      try {
        // A new owner request can atomically issue a grant between the read and the claim.
        if (!valid(JSON.parse(fs.readFileSync(claim,'utf8')))) {
          try { fs.linkSync(claim,grantPath); } catch { /* A newer grant already exists. */ }
          return null;
        }
      } finally { fs.unlinkSync(claim); }
      const now = clock();
      fs.writeFileSync(openedPath,String(now),{mode:0o600});
      closeSession();
      const session = crypto.randomBytes(32).toString('base64url');
      epoch = {digest:digest(session), until:now+duration, sockets:new Set(), timer:setTimeout(closeSession,duration)};
      epoch.timer.unref();
      return session;
    } catch { return null; }
  }
  function reply(res,status,body='',type='text/plain; charset=utf-8',extra={}) {
    res.writeHead(status,{...headers,'content-type':type,...extra}); res.end(body);
  }
  async function handle(req,res) {
    const raw = req.url||'';
    if (!raw.startsWith('/') || raw.startsWith('//') || /[\\\r\n]/.test(raw)) return reply(res,400);
    let url;
    try { url = new URL(raw,origin); } catch { return reply(res,400); }
    if (url.origin!==origin || !['GET','HEAD','POST'].includes(req.method)) return reply(res,400);
    // The external service may rewrite Host at its edge. Trust only the configured origin, never forwarded request headers.
    const route = url.pathname;
    if (req.method==='GET' && route==='/healthz') return reply(res,200,'ready');
    if (req.method==='GET' && route==='/') return reply(res,200,welcome,'text/html; charset=utf-8');
    if (req.method==='GET' && route==='/welcome.js') return reply(res,200,redeemScript,'text/javascript; charset=utf-8');
    if (req.method==='POST' && route==='/redeem') {
      if (url.search || req.headers.origin!==origin || req.headers['content-type']?.split(';')[0]!=='text/plain') return reply(res,403);
      if (Number(req.headers['content-length'])>64) return reply(res,413);
      const parts=[]; let size=0;
      for await (const part of req) { size+=part.length; if(size>64) return reply(res,413); parts.push(part); }
      const session = redeem(Buffer.concat(parts).toString('utf8'));
      if (!session) return reply(res,403);
      return reply(res,204,'','text/plain',{'set-cookie':cookieName+'='+session+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age='+Math.floor(duration/1000)});
    }
    if (!authenticate(req.headers.cookie)) return reply(res,401);
    if (req.method==='GET' && route==='/session') return reply(res,204);
    if (req.method!=='GET' && req.method!=='HEAD') return reply(res,405);
    // Only serve code/data shipped by the OS's noVNC package. Never expose browser/profile or handoff files.
    if (!/^\/(?:vnc\.html|(?:app|core|vendor)\/[a-zA-Z\d_.\-/]+)$/.test(route) || route.includes('..')) return reply(res,404);
    let file;
    try {file=fs.realpathSync(webRoot+route);} catch {return reply(res,404);}
    if (!file.startsWith(fs.realpathSync(webRoot)+path.sep) && !file.startsWith('/usr/share/javascript/')) return reply(res,404);
    const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json',
      '.ttf':'font/ttf','.otf':'font/otf','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.oga':'audio/ogg','.wasm':'application/wasm'};
    if (!fs.statSync(file).isFile()) return reply(res,404);
    if (route==='/vnc.html') {
      // Distribution noVNC pages bootstrap their trusted UI using inline module scripts.
      const nonce=crypto.randomBytes(18).toString('base64');
      const policy=headers['content-security-policy'].replace("script-src 'self'", "script-src 'self' 'nonce-"+nonce+"'");
      const page=fs.readFileSync(file,'utf8').replace(/<script(?=[\s>])/gi,'<script nonce="'+nonce+'"');
      return reply(res,200,req.method==='HEAD'?'':page,mime['.html'],{'content-security-policy':policy});
    }
    res.writeHead(200,{...headers,'content-type':mime[path.extname(file)]||'application/octet-stream'});
    if (req.method==='HEAD') return res.end();
    const stream=fs.createReadStream(file);
    stream.on('error',()=>res.destroy()); stream.pipe(res);
  }
  const server=http.createServer((req,res)=>{handle(req,res).catch(()=>{if(!res.headersSent)reply(res,500);else res.destroy();});});
  server.requestTimeout=12_000;
  server.headersTimeout=10_000;
  const websocket=wsModule ? new wsModule.WebSocketServer({noServer:true,perMessageDeflate:false,maxPayload:2*1024*1024}):null;
  server.on('upgrade',(req,socket,head)=>{
    if (!websocket || req.url!=='/desktop/socket' || req.headers.origin!==origin || !authenticate(req.headers.cookie)) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n');return;
    }
    const current=epoch;
    current.sockets.add(socket);
    socket.once('close',()=>current.sockets.delete(socket));
    websocket.handleUpgrade(req,socket,head,ws=>{
      const target=net.createConnection({host:'127.0.0.1',port:rfbPort});
      const stream=wsModule.createWebSocketStream(ws);
      const clean=()=>{target.destroy();stream.destroy();socket.destroy();};
      stream.on('error',clean);target.on('error',clean);
      target.on('close',()=>stream.end());stream.on('close',()=>target.destroy());
      target.pipe(stream).pipe(target);
    });
  });
  server.on('close',closeSession);
  return server;
}
module.exports={createGateway};
if (require.main===module) {
  createGateway({origin:process.env.OPARAX_DESKTOP_ORIGIN,stateDir:path.join(os.homedir(),'.oparax'),wsModule:require('/usr/share/nodejs/ws')})
    .listen(6080,'0.0.0.0');
}
