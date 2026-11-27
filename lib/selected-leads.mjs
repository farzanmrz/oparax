import {selectedSearchSources} from './search-source.mjs';
import {recordProspectSource} from './provenance.mjs';
import {Fault,edit,read,workspaceId,event,now} from './store.mjs';
import {bot,text,source,addLead,verifiedProfileMatch,associateQualifiedProspect,note} from './domain.mjs';
import {linkedinProfileUrl} from './profile-url.mjs';
import {attributedProfile,findIndexedProfiles,profileKey} from './research-profiles.mjs';
import {gatewaySearch,requestedRoleMatcher} from './company-index.mjs';
import {validatePlan,planPrompt,outreachDraft} from './research.mjs';
import {isPublishedProspect} from './qualification.mjs';

const services={linkedin:'LinkedIn',sales_navigator:'Sales Navigator'};
const norm=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const within=(hay,needle)=>!!needle&&(' '+norm(hay)+' ').includes(' '+norm(needle)+' ');
const clean=value=>text(value,180).replace(/[\r\n\t]+/g,' ');
const quoted=value=>'"'+clean(value).replace(/"/g,' ')+'"';

function navigatorLeadUrl(value) {
  try {
    const u=new URL(value);
    if(u.protocol!=='https:'||u.port||u.username||u.password||!/^((www|[a-z]{2})\.)?linkedin\.com$/i.test(u.hostname))return '';
    if(!/^\/sales\/(?:lead|people)\/[a-z0-9_.,%-]{4,300}\/?$/i.test(u.pathname))return '';
    return 'https://www.linkedin.com'+u.pathname.replace(/\/$/,'');
  } catch {return '';}
}

function selectedPeople(input) {
  if(!Array.isArray(input)||!input.length||input.length>20)throw new Fault('Select between 1 and 20 people to verify.');
  return input.map(row=>{
    const person=clean(row?.person),role=clean(row?.role),company=clean(row?.company);
    if(!person&&!role&&!company&&!row?.linkedinUrl&&!row?.salesNavigatorUrl)throw new Fault('Enter a selected profile first.');
    return {person,role,company,linkedinUrl:linkedinProfileUrl(row?.linkedinUrl),
      salesNavigatorUrl:navigatorLeadUrl(row?.salesNavigatorUrl)||navigatorLeadUrl(row?.linkedinUrl),
      sourceUrl:source(row?.sourceUrl)};
  });
}

export async function publicSources(people,plan,modelId) {
  const queries=people.filter(p=>!p.sourceUrl).map(p=>[quoted(p.person),quoted(p.company),quoted(p.role),'company profile or interview'].join(' '));
  for(const company of new Set(people.map(p=>p.company))) {
    const context=plan.companyContexts.find(c=>norm(c.company)===norm(company));
    queries.push([quoted(company),context?.industry,context?.domain?'site:'+context.domain:'official company products'].filter(Boolean).join(' '));
  }
  const groups=[];
  for(let i=0;i<queries.length;i+=4)groups.push(queries.slice(i,i+4));
  const results=await Promise.allSettled(groups.map(q=>gatewaySearch(q,{modelId,profiles:false,timeout:26000})));
  return results.flatMap(r=>r.status==='fulfilled'?r.value:[]).filter(h=>source(h.url));
}

const targetSignature=b=>JSON.stringify([b.brief,b.clarifications||[]]);
const keyFor=row=>row.linkedinUrl||row.salesNavigatorUrl||profileKey(row);

export async function verifySelections(id,people,plan,existingAnchors,deps) {
  const held=[],eligible=[],verified=[];
  const hold=(row,reason)=>held.push({...row,reason});
  const companySet=new Set(plan.employers.map(norm));
  const roleMatch=requestedRoleMatcher(plan,{roles:plan.roles,roleTerms:plan.roleTerms});
  for(const row of people){
    if(!row.linkedinUrl){hold(row,'Add the person’s public linkedin.com/in/ profile URL.');continue;}
    if(!row.person||!row.company||!row.role){hold(row,'Add the full name, current role and employer shown on the selected profile.');continue;}
    if(companySet.size&&!companySet.has(norm(row.company))){hold(row,'The selected employer is outside this brief.');continue;}
    if(plan.question||!roleMatch(row.role)){hold(row,plan.question||'The selected role is outside this brief.');continue;}
    eligible.push(row);
  }
  if(!eligible.length)return {held,verified};

  const modelId=process.env.OUTREACH_RESEARCH_MODEL||'openai/gpt-6.2-astra';
  const [profiles,articles]=await Promise.allSettled([
    (deps.findProfiles||findIndexedProfiles)(eligible,modelId,30000),
    (deps.findSources||publicSources)(eligible,plan,modelId)
  ]);
  const profileHits=profiles.status==='fulfilled'?profiles.value.results||[]:[];
  const evidence=articles.status==='fulfilled'?articles.value:[];
  const checks=[],owners=[];
  for(const row of eligible){
    const hits=profileHits.filter(h=>linkedinProfileUrl(h.url)===row.linkedinUrl);
    if(!hits.length){hold(row,'The selected personal profile could not be independently confirmed.');continue;}
    const target=plan.companyContexts.find(c=>norm(c.company)===norm(row.company))||{company:row.company,industry:'',domain:''};
    const host=target.domain||'';
    const anchors=evidence.filter(h=>{
      try{
        const hostname=new URL(h.url).hostname.replace(/^www\./,'').toLowerCase();
        const exact=host?hostname===host||hostname.endsWith('.'+host):hostname.split('.')[0]===norm(row.company).replaceAll(' ','');
        return exact&&within(h.title+' '+h.snippet,row.company);
      }catch{return false;}
    }).map(h=>source(h.url));
    const anchor=source(existingAnchors[row.company]?.source)||anchors[0]||'';
    const personal=evidence.filter(h=>within(h.title+' '+h.snippet,row.person)&&within(h.title+' '+h.snippet,row.company)).map(h=>source(h.url));
    const pages=[...new Set([row.sourceUrl,personal[0],anchor].filter(Boolean))];
    if(!pages.length){hold(row,'Add a public employer staff page or industry source naming this person and company.');continue;}
    for(const url of pages) {
      const hit=hits.find(h=>within(h.title+' '+h.snippet,row.role))||hits[0];
      checks.push({kind:'profile',company:row.company,person:row.person,role:row.role,source:url,companySource:anchor,
        researchTarget:target,profileHit:hit,quote:'',email:''});
      owners.push({row,hits});
    }
  }
  if(!checks.length)return {held,verified};
  const verify=deps.verify||((agentId,rows)=>import('./agent.mjs').then(m=>m.verifyOnComputer(agentId,rows)));
  let results;
  try{results=await verify(id,checks);}catch{results=checks.map(()=>({status:'unavailable'}));}
  const confirmed=new Set(),unavailable=new Set();
  results.forEach((result,i)=>{
    const subject=owners[i];
    if(!subject)return;
    const {row,hits}=subject;
    if(result.status==='unavailable'){unavailable.add(row);return;}
    if(result.status!=='verified'||!result.lead)return;
    const lead=result.lead;
    const profile=linkedinProfileUrl(lead.linkedinUrl)?{linkedinUrl:lead.linkedinUrl,linkedinEvidence:lead.linkedinEvidence}:attributedProfile(lead,hits);
    if(!profile||linkedinProfileUrl(profile.linkedinUrl)!==row.linkedinUrl||profileKey(row)!==profileKey(lead))return;
    const record={...lead,...profile,fit:lead.fit||[row.role,row.company].join(' · '),email:''};
    if(isPublishedProspect(record)&&!confirmed.has(row)){confirmed.add(row);verified.push({...row,record});}
  });
  for(const {row} of owners) {
    if(!confirmed.has(row)&&!held.some(x=>keyFor(x)===keyFor(row))) {
      hold(row,unavailable.has(row)?'A source was unavailable. Verify this selection again later.':'The available evidence did not confirm this role at the intended employer.');
    }
  }
  return {held,verified};
}

export async function importSelectedLeads(id,p,deps={}) {
  const provider=p?.source;
  if(!Object.hasOwn(services,provider))throw new Fault('Choose LinkedIn or Sales Navigator as the research source.');
  const people=selectedPeople(p.people),change=deps.edit||edit,get=deps.read||read;
  const current=bot((await get()).data,id);
  if(!selectedSearchSources(current).includes(provider))throw new Fault('The agent’s selected research source has changed.',409);
  const desktop=deps.desktop||((args)=>import('./agent-desktop.mjs').then(m=>m.getAgentDesktopState(args)));
  const session=await desktop({ownerId:(deps.workspaceId||workspaceId)(),agentId:id});
  if(session?.state!=='owner_opened')throw new Fault('Open this agent’s private browser and select the people to import first.',409);
  const signature=targetSignature(current),lease=crypto.randomUUID();
  const prior=await change(d=>{
    const b=bot(d,id);
    if(!selectedSearchSources(b).includes(provider)||targetSignature(b)!==signature)throw new Fault('The research brief or selected source changed. Reopen the agent.',409);
    const locks=b.selectedSourceLeases||={};
    if(locks[provider]&&Date.parse(locks[provider].until)>Date.now())throw new Fault('Your previous selection is being verified.',409);
    locks[provider]={id:lease,until:new Date(Date.now()+300000).toISOString()};
    return b.researchJob?.planSignature===signature?{plan:b.researchJob.plan,anchors:b.researchJob.companyProofs||{}}:{};
  });
  try{
    let plan=prior.plan,held=[],verified=[];
    if(!plan){
      const model=deps.model||((...args)=>import('./agent.mjs').then(m=>m.model(...args)));
      const context={brief:current.brief,clarifications:current.clarifications||[]};
      try{
        plan=validatePlan(await model([{role:'system',content:planPrompt},{role:'user',content:JSON.stringify(context)}],
          {modelId:process.env.OUTREACH_RESEARCH_MODEL||'openai/gpt-6.2-astra',effort:'low',timeout:25000,maxTokens:1700}),context);
      }catch{held=people.map(row=>({...row,reason:'The brief could not be checked. Your selection is held for another verification attempt.'}));}
    }
    if(plan)({held,verified}=await verifySelections(id,people,plan,prior.anchors||{},deps));
    await change(d=>{
      const b=bot(d,id);
      if(b.selectedSourceLeases?.[provider]?.id!==lease||!selectedSearchSources(b).includes(provider)||targetSignature(b)!==signature)throw new Fault('The research source or brief changed before this selection could be saved.',409);
      const receipt={at:now(),source:provider,received:people.length,saved:0,existing:0,held:held.slice(),verified:[]};
      const pending=new Map((b.selectedLeadsPending||[]).map(row=>[row.source+'|'+keyFor(row),row]));
      for(const entry of held)pending.set(provider+'|'+keyFor(entry),{...entry,source:provider});
      for(const {record,...entry} of verified){
        const conflict=d.leads.find(l=>profileKey(l)===profileKey(record)&&linkedinProfileUrl(l.linkedinUrl)&&linkedinProfileUrl(l.linkedinUrl)!==entry.linkedinUrl);
        if(conflict){
          const row={...entry,source:provider,reason:'A different profile is already saved for this name and employer.'};
          receipt.held.push(row);pending.set(provider+'|'+keyFor(entry),row);continue;
        }
        const added=addLead(d,b,outreachDraft(record));
        const saved=verifiedProfileMatch(d.leads,record);
        if(!saved||!isPublishedProspect(saved)){
          const row={...entry,source:provider,reason:'The existing prospect still needs verification.'};
          receipt.held.push(row);pending.set(provider+'|'+keyFor(entry),row);continue;
        }
        associateQualifiedProspect(saved,id);
        recordProspectSource(saved,{source:provider,agentId:id,at:receipt.at,url:entry.salesNavigatorUrl||entry.linkedinUrl,detail:'Selected in '+services[provider]+'.'});
        if(!saved.selectedSources?.some(s=>s.agentId===id&&s.source===provider)) {
          saved.selectedSources=[...(saved.selectedSources||[]),{agentId:id,source:provider,at:receipt.at,...(entry.salesNavigatorUrl?{salesNavigatorUrl:entry.salesNavigatorUrl}:{})}];
        }
        if(added)receipt.saved++;else receipt.existing++;
        receipt.verified.push({person:entry.person,role:entry.role,linkedinUrl:entry.linkedinUrl});
        pending.delete(provider+'|'+keyFor(entry));
      }
      b.selectedLeadsPending=[...pending.values()].slice(-120);b.lastSelectedImport=receipt;(b.lastSelectedImports||={})[provider]=receipt;delete b.selectedSourceLeases[provider];
      const message=services[provider]+' selection verified. '+receipt.saved+' saved, '+receipt.existing+' already in Prospects, '+receipt.held.length+' held for evidence.';
      note(d,id,'assistant',message);event(d,b.name+' · '+message);
    });
  }catch(error){
    await change(d=>{const b=bot(d,id);if(b.selectedSourceLeases?.[provider]?.id===lease)delete b.selectedSourceLeases[provider];});
    throw error;
  }
}
