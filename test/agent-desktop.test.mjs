import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {desktopName} from '../lib/agent-desktop.mjs';
import gateway from '../lib/desktop-proxy.cjs';

const uid='ab1df3c8-a119-46f8-afcc-c35c3ba8e26e', aid='b02d34ef-000a-471b-999e-3814811f947d';
test('project VM names bind valid workspace and agent ids in the same order',()=>{
  assert.match(desktopName(uid,aid),/^oparax-desk-[a-f0-9]{32}$/);
  assert.equal(desktopName(uid,aid),desktopName(uid.toUpperCase(),aid));
  assert.notEqual(desktopName(uid,aid),desktopName(aid,uid));
  assert.throws(()=>desktopName(uid,'../../another-workspace'));
});
async function fixture(t,settings={}) {
  const dir=await mkdtemp(path.join(tmpdir(),'oparax-desktop-test-'));
  const webRoot=path.join(dir,'site');
  await mkdir(webRoot);
  await writeFile(path.join(webRoot,'vnc.html'),'<script type="module">/* trusted */</script>');
  const origin='https://workspace.example', cid={now:Date.now()};
  const server=gateway.createGateway({origin,stateDir:dir,webRoot,clock:()=>cid.now,...settings});
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
  const issue=async(delta=90000)=>{
    const nonce=randomBytes(32).toString('base64url');
    await writeFile(path.join(dir,'desktop-grant.json'),JSON.stringify({digest:createHash('sha256').update(nonce).digest('hex'),expiresAt:cid.now+delta}));
    return nonce;
  };
  const redeem=(value,options={})=>fetch(base+'/redeem',{method:'POST',headers:{origin,'content-type':'text/plain',...options},body:value});
  return {dir,base,issue,redeem,origin,cid};
}
test('only an unexpired same-origin owner handoff can open the remote desktop; it is consumed once and its cookie is confined',async t=>{
  const f=await fixture(t);
  const protectedPage=()=>fetch(f.base+'/vnc.html');
  assert.equal((await protectedPage()).status,401);
  assert.equal((await fetch(f.base+'/%2e%2e%2fdesktop-grant.json')).status,401);
  const token=await f.issue();
  assert.equal((await f.redeem(token,{origin:'https://other.example'})).status,403);
  assert.equal((await f.redeem(token.replace(/.$/,'%41'))).status,403);
  assert.equal((await f.redeem(token+'\r\n')).status,403);
  assert.equal((await f.redeem(token,{'content-type':'application/json'})).status,403);
  const [one,two]=await Promise.all([f.redeem(token),f.redeem(token)]);
  assert.deepEqual([one.status,two.status].sort(),[204,403]);
  const success=one.status===204?one:two, cookie=success.headers.get('set-cookie');
  assert.match(cookie,/^__Host-oparax-desktop=/);assert.match(cookie,/; Secure; HttpOnly; SameSite=Strict;/);assert.ok(!cookie.includes('Domain='));
  assert.match(success.headers.get('cache-control'),/no-store/);
  const cookieHeader={cookie:cookie.split(';')[0]};
  const ui=await fetch(f.base+'/vnc.html',{headers:cookieHeader});
  assert.equal(ui.status,200);assert.match(ui.headers.get('content-security-policy'),/script-src 'self' 'nonce-[^']+'/);
  assert.match(await ui.text(),/<script nonce=/);
  assert.equal(await readFile(path.join(f.dir,'desktop-opened'),'utf8'),String(f.cid.now));
  assert.equal((await fetch(f.base+'/app/%2e%2e%2fdesktop-grant.json',{headers:cookieHeader})).status,404);
  assert.equal((await fetch(f.base+'/desktop-opened',{headers:cookieHeader})).status,404);
  f.cid.now+=16*60_000;
  assert.equal((await fetch(f.base+'/vnc.html',{headers:cookieHeader})).status,401);
  assert.equal((await f.redeem(await f.issue(-1))).status,403);
});
test('opening a fresh owner handoff revokes the previously issued desktop cookie',async t=>{
  const f=await fixture(t);
  const old=(await f.redeem(await f.issue())).headers.get('set-cookie').split(';')[0];
  const fresh=(await f.redeem(await f.issue())).headers.get('set-cookie').split(';')[0];
  assert.notEqual(fresh,old);
  assert.equal((await fetch(f.base+'/session',{headers:{cookie:old}})).status,401);
  assert.equal((await fetch(f.base+'/session',{headers:{cookie:fresh}})).status,204);
});
test('desktop websocket cannot be reached without authentication',async t=>{
  const f=await fixture(t);
  const request=http.get(f.base+'/desktop/socket',{headers:{upgrade:'websocket',connection:'Upgrade',origin:f.origin}});
  const [res]=await once(request,'response');
  assert.equal(res.statusCode,401);res.resume();
});

test('authenticated upgraded connections end on replacement and expiry',async t=>{
  // A minimal upgrade adapter keeps the test independent from the VM's packaged ws.
  class UpgradeAdapter {
    handleUpgrade(_req,socket) {socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');}
  }
  const f=await fixture(t,{wsModule:{WebSocketServer:UpgradeAdapter},duration:1050});
  async function open(cookie,origin=f.origin) {
    const req=http.get(f.base+'/desktop/socket',{headers:{upgrade:'websocket',connection:'Upgrade',origin,cookie}});
    return Promise.race([once(req,'upgrade').then(([,s])=>s),once(req,'response').then(([res])=>{res.resume();return res.statusCode;})]);
  }
  const old=(await f.redeem(await f.issue())).headers.get('set-cookie').split(';')[0];
  assert.equal(await open(old,'https://other.example'),401);
  const oldSocket=await open(old), closed=once(oldSocket,'close');
  const next=(await f.redeem(await f.issue())).headers.get('set-cookie').split(';')[0];
  await closed;
  assert.equal(await open(old),401);
  const fresh=await open(next);
  await once(fresh,'close');
});

test('VM-local first boot is fenced per request, source and attempt, and recovery is bounded', {skip:process.platform==='win32'}, async t=>{
  const call=promisify(execFile);
  const dir=await mkdtemp(path.join(tmpdir(),'oparax-desktop-job-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const root=path.join(dir,'state');
  const env={...process.env,OPARAX_DESKTOP_STATE_DIR:root};
  const helper=path.join(dir,'desktop-job.sh');
  await writeFile(helper,await readFile(new URL('../lib/desktop-job.sh',import.meta.url)));
  // Exercise supervisor failure only. No browser or package manager is involved.
  await writeFile(path.join(dir,'desktop-start.sh'),'exit 23\n');
  const opted='https://www.linkedin.com/login', another='https://www.linkedin.com/sales/home';
  const args=(mode,id,url=opted,attempt)=>[helper,mode,id,'https://machine.example',url,...(attempt?[String(attempt)]:[])];
  async function invoke(...v){return (await call('bash',args(...v),{env})).stdout.trim();}
  assert.equal(await invoke('inspect',uid),'launch 1');
  assert.equal(await invoke('inspect',uid),'starting');
  assert.equal(await invoke('inspect',uid,another),'superseded');
  assert.equal(await invoke('inspect',aid),'starting');
  assert.equal(await invoke('boot',uid,opted,2),''); // attempt 2 was never issued
  assert.equal(await invoke('inspect',uid),'starting');
  await writeFile(path.join(root,'desktop-jobs',uid,'changed'),String(Math.floor(Date.now()/1000)-60));
  assert.equal(await invoke('inspect',uid),'launch 2'); // detached dispatch disappeared
  await invoke('boot',uid,opted,2);
  assert.equal(await invoke('inspect',uid),'failed');
  assert.equal(await invoke('inspect',aid,another),'launch 1');
  assert.equal(await invoke('inspect',uid),'superseded');
  await invoke('boot',aid,another,1);
  assert.equal(await invoke('inspect',aid,another),'launch 2'); // explicit failure can retry
});

test('Chrome deploys the official 1Password Web Store extension using a managed machine policy',async()=>{
  const boot=await readFile(new URL('../lib/desktop-start.sh',import.meta.url),'utf8');
  const policy=JSON.parse(boot.match(/<<'POLICY'\n([\s\S]*?)\nPOLICY/)[1]);
  assert.deepEqual(policy.ExtensionSettings,{'aeblfdkhhhdcdjpifhhbdiojplfjncoa':{
    installation_mode:'force_installed',update_url:'https://clients2.google.com/service/update2/crx',toolbar_pin:'force_pinned'
  }});
  assert.match(boot,/policy_dir=\/etc\/opt\/chrome\/policies\/managed/);
  assert.ok(boot.indexOf('policy_dir=')<boot.indexOf('nohup google-chrome-stable'));
  assert.ok(!/--load-extension|--remote-debugging/.test(boot));
});

test('a previously ready VM adopts the new desktop release even after its old request used all boot attempts',{skip:process.platform==='win32'},async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'oparax-upgrade-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const state=path.join(dir,'state'), prior=path.join(dir,'previous-release'),current=path.join(dir,'current-release');
  await Promise.all([mkdir(prior),mkdir(current)]);
  const code=await readFile(new URL('../lib/desktop-job.sh',import.meta.url));
  for(const release of [prior,current])await writeFile(path.join(release,'desktop-job.sh'),code);
  const args=['inspect',uid,'https://sandbox.example','https://www.linkedin.com/login'];
  const inspect=async release=>(await promisify(execFile)('bash',[path.join(release,'desktop-job.sh'),...args],{env:{...process.env,OPARAX_DESKTOP_STATE_DIR:state}})).stdout.trim();
  assert.equal(await inspect(prior),'launch 1');
  const job=path.join(state,'desktop-jobs',uid);
  await writeFile(path.join(job,'phase'),'ready');
  await writeFile(path.join(job,'attempt'),'2');
  assert.equal(await inspect(current),'launch 1');
  assert.equal((await readFile(path.join(job,'release'),'utf8')).trim(),'current-release');
  assert.equal(await inspect(current),'starting');
});
