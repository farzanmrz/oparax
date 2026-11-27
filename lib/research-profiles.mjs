import {linkedinProfileUrl} from './profile-url.mjs';
import {gatewaySearch} from './company-index.mjs';

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
  const independent=tokens(person.evidence||person.quote);
  const proof=person.companyVerification;
  // A fetched article directly naming the employee, role and employer can establish
  // the role when a uniquely matching personal-profile title omits the job title.
  const independentlyNamed=!!proof?.source&&person.verificationSource!=='profile_index'&&proof.source===person.source&&
    tokens(proof.name)===company&&!!proof.evidence&&phrase(independent,name)&&phrase(independent,role)&&phrase(independent,company);
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
    const explicitProfileEmployer=companiesInTitle.includes(company)||!!(namedEmployer&&tokens(namedEmployer[1].split(/,|\s[-–—]\s/)[0])===company);
    const independentlyIdentified=independentlyNamed&&head===name&&explicitProfileEmployer;
    if((industry.length||context.domain||middleName)&&!roleMatch&&!functionalMatch&&!sameSector&&!independentlyIdentified)continue;
    const support=employmentSnippets.find(s=>phrase(tokens(s),role)||industry.some(t=>phrase(tokens(s),tokens(t))));
    if(support&&!evidence.includes(support))evidence=(evidence+' · '+support).slice(0,500);
    if(independentlyIdentified&&!roleMatch&&!functionalMatch&&!sameSector) {
      evidence=(evidence+' · Independent employment source: '+String(person.evidence||person.quote).slice(0,260)).slice(0,620);
    }
    matches.set(url,{linkedinUrl:url,linkedinEvidence:evidence,roleMatch:roleMatch||matches.get(url)?.roleMatch});
  }
  // If the index surfaces namesakes at the same company, require one unique role match.
  const candidates=[...matches.values()];
  const selected=candidates.length===1?candidates[0]:candidates.filter(x=>x.roleMatch).length===1?candidates.find(x=>x.roleMatch):null;
  return selected?{linkedinUrl:selected.linkedinUrl,linkedinEvidence:selected.linkedinEvidence}:null;
}

export async function findIndexedProfiles(people,modelId,timeout=27000,{search=gatewaySearch,onSearch}={}) {
  const deadline=Date.now()+timeout;
  const timeLeft=cap=>Math.max(1,Math.min(cap,deadline-Date.now()));
  const query=p=>'site:linkedin.com/in/ "'+String(p.person).replace(/"/g,' ')+'" "'+String(p.company).replace(/"/g,' ')+'"';
  const results=[];
  let searchCount=0;
  const send=async(provider,queries,cap)=>{
    try {
      await onSearch?.({provider,queries,purpose:'enrichment',phase:'submitted'});
      const response=await search(queries,{modelId,profiles:true,provider,timeout:timeLeft(cap),
        onExecuted:actual=>onSearch?.({provider,queries:actual,purpose:'enrichment',phase:'executed'})});
      results.push(...response);searchCount++;
    } catch {} // A transport error never validates a model-proposed profile URL.
  };
  // Sparse profile titles are commonly indexed as "Name - Employer". Job-title
  // constraints at this stage can preferentially return coworkers who mention them.
  const jobs=[];
  for(let i=0;i<people.length;i+=4)jobs.push(send('perplexity',people.slice(i,i+4).map(query),17000));
  for(const p of people)jobs.push(send('exa',[query(p)],17000));
  await Promise.all(jobs);
  const missing=people.filter(p=>!attributedProfile(p,results));
  if(missing.length&&timeLeft(12000)>3000) {
    const fallback=[];
    for(let i=0;i<missing.length;i+=3) {
      fallback.push(send('sonar',missing.slice(i,i+3).map(p=>query(p)+' professional profile'),12000));
    }
    await Promise.all(fallback);
  }
  return {results,failed:searchCount===0};
}

export async function findIndexedArticles(context,modelId,timeout) {
  const {generateText,gateway}=await import('ai');
  const result=await generateText({
    model:gateway(modelId),prompt:'Find credible company or industry articles naming people or organizations matching this brief. Query by each requested role, industry, and exact employer. Use several variations in one search query array. Focus on new prospects distinct from those already saved. '+JSON.stringify(context),
    tools:{perplexity_search:gateway.tools.perplexitySearch({maxResults:15,maxTokensPerPage:650,searchDomainFilter:['-linkedin.com']})},
    toolChoice:{type:'tool',toolName:'perplexity_search'},maxOutputTokens:1400,maxRetries:0,abortSignal:AbortSignal.timeout(timeout)
  });
  const rows=profileResults(result.steps).map(r=>({...r,snippet:r.snippet.slice(0,1500)}));
  const actual=result.steps.flatMap(step=>step.toolCalls||[]).filter(t=>t.toolName==='perplexity_search')
    .flatMap(t=>[t.input?.query].flat()).filter(q=>typeof q==='string');
  if(actual.length)rows.executedQueries=actual;
  return rows;
}
