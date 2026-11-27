import {linkedinProfileUrl} from './profile-url.mjs';

const tokens=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const profileKey=row=>tokens(row.company)+'/'+tokens(row.person);
const phrase=(haystack,needle)=>!!needle && (' '+haystack+' ').includes(' '+needle+' ');

export function profileResults(steps) {
  const rows=[];
  let searched=false;
  for(const step of steps||[])for(const item of step.toolResults||[]) {
    if(item.toolName!=='perplexity_search'||item.providerExecuted!==true||!Array.isArray(item.output?.results))continue;
    searched=true;
    for(const hit of item.output.results) {
      if(typeof hit?.url==='string'&&typeof hit.title==='string')rows.push({url:hit.url,title:hit.title,snippet:typeof hit.snippet==='string'?hit.snippet:''});
    }
  }
  if(!searched)throw Error('The profile index did not return a search result.');
  return rows;
}

export function attributedProfile(person,results) {
  const name=tokens(person.person),company=tokens(person.company),role=tokens(person.role);
  if(name.split(' ').length<2||!company)return null;
  const matches=new Map();
  for(const hit of results) {
    const url=linkedinProfileUrl(hit.url);
    const title=String(hit.title||'').trim(),label=tokens(title),snippet=String(hit.snippet||'').slice(0,600);
    if(!url||!label)continue;
    // The title must identify this person, not another whose name begins with theirs.
    const headline=title.split(/\s[|–—-]\s|\s*\|\s*/u)[0].trim();
    const head=tokens(headline),parts=head.split(' '),wanted=name.split(' ');
    const middleName=wanted.length===2&&parts.length>=3&&parts.length<=4&&parts[0]===wanted[0]&&parts.at(-1)===wanted.at(-1);
    if(head!==name&&!middleName)continue;
    const headlineRest=title.slice(headline.length);
    const employmentSnippets=snippet.split(/(?:\s+[·|]\s+|(?<=[.!?])\s+)/u)
      .filter(s=>s.length<=350&&!/can introduce|people (?:who work |working )?at|mutual connections?|previous|former|formerly|past experience|worked at|ex[- ]employee/i.test(s));
    const employerInTitle=phrase(tokens(headlineRest),company)&&!/(?:former(?:ly)?|previous(?:ly)?|\bex)[\s-]/i.test(headlineRest);
    const employerInSnippet=employmentSnippets.find(s=>{
      const words=tokens(s);
      return ['experience '+company,'at '+company,'employer '+company,'company '+company].some(term=>phrase(words,term))
        ||(role&&phrase(words,role)&&phrase(words,company));
    });
    if(!employerInTitle&&!employerInSnippet)continue;
    const namedEmployer=headlineRest.match(/\bat\s+([^|·–—]+)/i);
    const legalSuffix=/^(?:(?:inc|ltd|limited|llc|plc|corporation|corp|uk|usa|us|group)\s*)*$/;
    if(namedEmployer) {
      const employer=tokens(namedEmployer[1].split(/,|\s[-–—]\s/)[0]);
      if(employer!==company&&(!employer.startsWith(company+' ')||!legalSuffix.test(employer.slice(company.length+1))))continue;
    }
    const companiesInTitle=headlineRest.split(/\s[-–—]\s|[|·]/).map(part=>tokens(part.replace(/^[-–—]\s*/,'')));
    if(companiesInTitle.some(part=>part.startsWith(company+' ')&&!legalSuffix.test(part.slice(company.length+1))))continue;
    let evidence=(title+(employerInTitle?'':' · '+employerInSnippet)).slice(0,500);
    const roleText=tokens(evidence+' '+employmentSnippets.join(' '));
    const roleMatch=!!role&&phrase(roleText,role);
    const functionalWords=role.split(' ').filter(w=>w.length>2&&!['the','and','for','head','director','lead','manager','chief','executive','senior','global','vice','president','officer','international'].includes(w));
    const functionalMatch=functionalWords.some(w=>phrase(roleText,w));
    const currentRole=headlineRest.match(/(?:[-–—|]\s*)(.+?)\s+(?:at|@)\s+/i);
    if(currentRole&&functionalWords.length&&!functionalWords.some(w=>phrase(tokens(currentRole[1]),w))&&!roleMatch)continue;
    const context=person.researchTarget||{};
    const industry=[context.industry,...(context.industryTerms||[])].filter(Boolean);
    const location=tokens(title+' '+employmentSnippets.join(' '));
    const sameSector=industry.some(t=>phrase(location,tokens(t)))||!!(context.domain&&phrase(location,tokens(context.domain)));
    if((industry.length||context.domain||middleName)&&!roleMatch&&!functionalMatch&&!sameSector)continue;
    const support=employmentSnippets.find(s=>phrase(tokens(s),role)||industry.some(t=>phrase(tokens(s),tokens(t))));
    if(support&&!evidence.includes(support))evidence=(evidence+' · '+support).slice(0,500);
    matches.set(url,{linkedinUrl:url,linkedinEvidence:evidence,roleMatch:roleMatch||matches.get(url)?.roleMatch});
  }
  // If the index surfaces namesakes at the same company, require one unique role match.
  const candidates=[...matches.values()];
  const selected=candidates.length===1?candidates[0]:candidates.filter(x=>x.roleMatch).length===1?candidates.find(x=>x.roleMatch):null;
  return selected?{linkedinUrl:selected.linkedinUrl,linkedinEvidence:selected.linkedinEvidence}:null;
}

export async function findIndexedProfiles(people,modelId,timeout=27000) {
  const {generateText,gateway}=await import('ai');
  const groups=[];
  for(let i=0;i<people.length;i+=4)groups.push(people.slice(i,i+4));
  const calls=await Promise.allSettled(groups.map(async group=>{
    const queries=group.map(p=>'site:linkedin.com/in/ "'+p.person+'" "'+p.company+'" '+(p.role||''));
    const result=await generateText({
      model:gateway(modelId),
      prompt:'Search the public index for these exact LinkedIn professional profile queries. Submit every query below as a single query array to the search tool. Use only the index.\n'+JSON.stringify(queries),
      tools:{perplexity_search:gateway.tools.perplexitySearch({searchDomainFilter:['linkedin.com'],maxResults:8,maxTokensPerPage:300})},
      toolChoice:{type:'tool',toolName:'perplexity_search'},maxOutputTokens:1200,maxRetries:0,
      abortSignal:AbortSignal.timeout(timeout)
    });
    return profileResults(result.steps);
  }));
  return {results:calls.flatMap(c=>c.status==='fulfilled'?c.value:[]),failed:calls.some(c=>c.status==='rejected')};
}

export async function findIndexedArticles(context,modelId,timeout) {
  const {generateText,gateway}=await import('ai');
  const result=await generateText({
    model:gateway(modelId),prompt:'Find credible company or industry articles naming people or organizations matching this brief. Query by each requested role, industry, and exact employer. Use several variations in one search query array. Focus on new prospects distinct from those already saved. '+JSON.stringify(context),
    tools:{perplexity_search:gateway.tools.perplexitySearch({maxResults:15,maxTokensPerPage:650,searchDomainFilter:['-linkedin.com']})},
    toolChoice:{type:'tool',toolName:'perplexity_search'},maxOutputTokens:1400,maxRetries:0,abortSignal:AbortSignal.timeout(timeout)
  });
  return profileResults(result.steps).map(r=>({...r,snippet:r.snippet.slice(0,1500)}));
}
