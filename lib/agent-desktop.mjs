import {createHash, randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Fault,edit,read} from './store.mjs';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const servicePort = 6080;
const handoffLifetime = 90_000;
const desktopLifetime = 15 * 60_000;
const destinations = Object.freeze({
  desktop: 'about:blank',
  linkedin: 'https://www.linkedin.com/feed/',
  sales_navigator: 'https://www.linkedin.com/sales/home'
});

export function desktopName(ownerId, legacyAgentId = null) {
  if (!uuid.test(ownerId) || (legacyAgentId !== null && !uuid.test(legacyAgentId))) throw new Fault('Invalid workspace computer.', 400);
  const identifier=legacyAgentId ? ownerId.toLowerCase()+'/'+legacyAgentId.toLowerCase() : ownerId.toLowerCase();
  const key = createHash('sha256').update(identifier).digest('hex');
  return 'oparax-desk-' + key.slice(0, 32);
}

export async function workspaceDesktopName(ownerId, {getWorkspace=read,saveWorkspace=edit,lookup}) {
  const {data}=await getWorkspace();
  if(data.browserProfile)return desktopName(ownerId,data.browserProfile.legacyAgentId);
  // Adopt an existing browser in place. Only look up names derived from this owner's bots,
  // without starting their machines or reading their browser data.
  const ids=(data.bots||[]).map(b=>b.id).filter(id=>uuid.test(id));
  let newest=null;
  for(let offset=0;offset<ids.length;offset+=5){
    const matches=await Promise.all(ids.slice(offset,offset+5).map(async agentId=>{
      const name=desktopName(ownerId,agentId);
      try{
        const vm=await lookup({name,resume:false});
        return {agentId,updatedAt:vm.updatedAt.getTime()};
      }catch(error){
        if(error.response?.status===404||error.json?.error?.code==='snapshot_not_found')return null;
        throw error;
      }
    }));
    for(const match of matches)if(match&&(!newest||match.updatedAt>newest.updatedAt))newest=match;
  }
  const anchor=await saveWorkspace(current=>{
    current.browserProfile??={legacyAgentId:newest?.agentId??null};
    return current.browserProfile.legacyAgentId;
  });
  return desktopName(ownerId,anchor);
}

let release;
function runtimeRelease() {
  if (!release) release = (async()=>{
    const files = await Promise.all(['desktop-job.sh','desktop-start.sh','desktop-proxy.cjs'].map(async name=>({
      name,content:await readFile(process.cwd()+'/lib/'+name)
    })));
    const hash=createHash('sha256');
    for(const file of files)hash.update(file.name).update(file.content);
    return {files,dir:'.oparax-runtime-'+hash.digest('hex').slice(0,16)};
  })().catch(error=>{release=null;throw error;});
  return release;
}

async function installRuntime(vm) {
  const {files,dir}=await runtimeRelease();
  if ((await vm.runCommand('test',['-s',dir+'/desktop-job.sh'])).exitCode===0)return dir;
  const staging=dir+'-'+randomBytes(8).toString('hex');
  const created=await vm.runCommand('mkdir',['-m','700',staging]);
  if(created.exitCode!==0)throw new Fault('Could not prepare the agent computer.',503);
  await vm.writeFiles(files.map(f=>({path:staging+'/'+f.name,content:f.content})));
  const installed=await vm.runCommand('bash',['-c','mv -T -- "$1" "$2" 2>/dev/null || { test -s "$2/desktop-job.sh" && rm -r -- "$1"; }','publish',staging,dir]);
  if(installed.exitCode!==0)throw new Fault('Could not prepare the agent computer.',503);
  return dir;
}

export async function openAgentDesktop({ownerId, agentId, provider, requestId}) {
  if(!uuid.test(agentId))throw new Fault('Invalid agent computer.',400);
  if(!uuid.test(requestId))throw new Fault('Invalid computer request.',400);
  if (!Object.hasOwn(destinations, provider)) throw new Fault('Choose an available desktop destination.', 400);
  const {Sandbox} = await import('@vercel/sandbox');
  const name=await workspaceDesktopName(ownerId,{lookup:params=>Sandbox.get(params)});
  const vm = await Sandbox.getOrCreate({name, resume:true, persistent:true, ports:[servicePort], resources:{vcpus:2},
    timeout:30*60_000, image:'vercel/sandbox/universal:latest', keepLastSnapshots:{count:1}});
  const host = new URL(vm.domain(servicePort));
  if (host.protocol !== 'https:' || host.username || host.password) throw new Fault('Secure computer access is unavailable.', 503);
  const dir = await installRuntime(vm);
  const args = [requestId.toLowerCase(),host.origin,destinations[provider]];
  const check = await vm.runCommand('bash',[dir+'/desktop-job.sh','inspect',...args]);
  if(check.exitCode!==0)throw new Fault('Could not check the agent computer. Reopen it to retry.',503);
  const phase=(await check.stdout()).trim();
  if(phase==='superseded')throw new Fault('A newer computer request opened. Start a fresh request for this agent.',409);
  if(phase==='starting')return {status:'starting',retryAfterMs:3500};
  if(/^launch [12]$/.test(phase)) {
    await vm.runCommand({cmd:'bash',args:[dir+'/desktop-job.sh','boot',...args,phase.at(-1)],detached:true});
    return {status:'starting',retryAfterMs:3500};
  }
  if(phase!=='ready')throw new Fault('The private browser could not start. Reopen the agent computer to retry.',503);
  // Keep a returning owner's full session available even if the existing VM was close to timeout.
  const remaining=vm.expiresAt?.getTime()-Date.now();
  if (Number.isFinite(remaining) && remaining<desktopLifetime+handoffLifetime) {
    await vm.extendTimeout(desktopLifetime+handoffLifetime-remaining);
  }
  // Start the handoff clock only after package installation and browser startup.
  const nonce = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + handoffLifetime;
  const grant = {digest:createHash('sha256').update(nonce).digest('hex'), expiresAt};
  // SDK file input contains only a digest. Atomic publication avoids partially read grants.
  const temp = 'grant-' + randomBytes(12).toString('hex') + '.json';
  await vm.writeFiles([{path:temp, content:Buffer.from(JSON.stringify(grant))}]);
  const commit = await vm.runCommand('bash',['-c','chmod 600 "$1" && mv -f -- "$1" "$HOME/.oparax/desktop-grant.json"','grant',temp]);
  if (commit.exitCode !== 0) throw new Fault('The computer could not issue a private sign-in link.', 503);
  return {url:host.origin+'/#'+nonce, expiresAt:new Date(expiresAt).toISOString(), provider, sessionMinutes:desktopLifetime/60_000};
}

export async function getAgentDesktopState({ownerId,agentId}) {
  if(!uuid.test(agentId))throw new Fault('Invalid agent computer.',400);
  try {
    const {Sandbox} = await import('@vercel/sandbox');
    const name=await workspaceDesktopName(ownerId,{lookup:params=>Sandbox.get(params)});
    const vm = await Sandbox.get({name,resume:false});
    if (vm.status !== 'running') return {state:'unconfirmed'};
    const result = await vm.currentSession().runCommand('bash',['-c','cat "$HOME/.oparax/desktop-opened" 2>/dev/null']);
    const opened = Number(result.exitCode === 0 && (await result.stdout()).trim());
    if (opened > Date.now()-desktopLifetime && opened <= Date.now()) return {state:'owner_opened',openedAt:new Date(opened).toISOString()};
  } catch { /* A stopped or never-provisioned machine cannot confirm a current handoff. */ }
  return {state:'unconfirmed'};
}
