const labels={web:'Public web',linkedin:'LinkedIn',sales_navigator:'Sales Navigator',email:'Connected email',rocketreach:'RocketReach'};
function webUrl(value){
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export function recordProspectSource(lead,{source,agentId,at,detail='',url=''}){
  if(!Object.hasOwn(labels,source)||!agentId)return;
  lead.discoverySources ||= [];
  const sources=lead.discoverySources;
  const known=sources.find(s=>s.source===source&&s.agentId===agentId);
  const data={source,agentId,at,detail:String(detail||'').slice(0,240)};
  if(source!=='email'&&webUrl(url))data.url=webUrl(url);
  if(known){
    if(at&&(!known.lastVerifiedAt||at>known.lastVerifiedAt))known.lastVerifiedAt=at;
    if(data.detail)known.detail=data.detail;
    if(data.url)known.url=data.url;
  }
  else sources.push(data);
}
export function prospectSources(lead,agentId){
  if(!lead)return [];
  const scoped=row=>!agentId||row.agentId===agentId;
  const rows=(lead.discoverySources||[]).filter(scoped).map(r=>({...r}));
  for(const row of lead.selectedSources||[]){
    if(scoped(row)&&!rows.some(r=>r.source===row.source))rows.push({...row,url:row.salesNavigatorUrl||lead.linkedinUrl});
  }
  if(!rows.length&&!lead.selectedSources?.length&&!lead.discoverySources?.length&&lead.origin==='research'&&webUrl(lead.source)){
    rows.push({source:'web',url:lead.source,detail:'Public sources verified this person.'});
  }
  return rows.filter(r=>Object.hasOwn(labels,r.source)).map(r=>({
    source:r.source,label:labels[r.source],...(r.source!=='email'&&webUrl(r.url)?{url:webUrl(r.url)}:{}),...(r.detail?{detail:r.detail}:{})
  }));
}
