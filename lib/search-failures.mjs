import {Fault} from './store.mjs';

const providers={perplexity:'Perplexity',exa:'Exa',sonar:'Sonar',parallel:'Parallel',profiles:'Profile search',articles:'Article search'};
const labels={
  access:'access denied',billing:'billing or quota restriction',request:'request rejected',
  rate:'rate limited',timeout:'request timed out',network:'connection interrupted',
  service:'temporary service failure',response:'no usable provider response'
};
const transient=new Set(['rate','timeout','network','service']);

function retryAfter(error) {
  const h=error?.responseHeaders||error?.headers;
  const value=h?.get?.('retry-after')??h?.['retry-after']??h?.['Retry-After'];
  if(value==null||String(value).trim()==='')return 0;
  const delay=Number(value);
  return Number.isFinite(delay)?Math.max(0,delay*1000):Math.max(0,Date.parse(value)-Date.now())||0;
}

export function searchIssue(provider,error) {
  // Inspect common SDK error shapes but store only finite categories and numeric status codes.
  const chain=[error,error?.lastError,error?.cause,error?.cause?.cause].filter(Boolean);
  const statuses=chain.flatMap(e=>[e.statusCode,e.response?.status,e instanceof Fault?undefined:e.status]).map(Number);
  const statusFromGateway=String(error?.message||'').match(/AI Gateway returned (\d{3})\b/i);
  const status=statusFromGateway?Number(statusFromGateway[1]):statuses.find(s=>s>=400&&s<=599);
  const code=chain.map(e=>[e.code,e.name,e.data?.error?.code,e.data?.code,e.message].join(' ')).join(' ').slice(0,1800);
  let kind='response';
  if(status===402||/insufficient[_ ](?:funds|credits?|quota)|billing.hard.limit|credit balance|payment.required/i.test(code))kind='billing';
  else if(status===401||status===403||/invalid.api.key|authentication.required|connect vercel ai gateway/i.test(code))kind='access';
  else if(status===429||/rate[_ ]limit(?:ed|ing)?|too many requests/i.test(code))kind='rate';
  else if(status===408||status===504||/TimeoutError|ETIMEDOUT|timed out/i.test(code))kind='timeout';
  else if(status>=400&&status<500)kind='request';
  else if([500,502,503].includes(status))kind='service';
  else if(/ECONNRESET|EAI_AGAIN|ENETUNREACH|ECONNREFUSED|UND_ERR_SOCKET|network connection was lost/i.test(code))kind='network';
  return {provider:Object.hasOwn(providers,provider)?provider:'profiles',kind,...(status?{status}:{}),
    retryAfterMs:Math.max(0,...chain.map(retryAfter))};
}

export function issuesFor(provider,error) {
  return error instanceof SearchInterruption?error.issues:[searchIssue(provider,error)];
}

export class SearchInterruption extends Fault {
  constructor(issues) {
    const unique=[...new Map(issues.map(issue=>[issue.provider+'/'+issue.kind+'/'+(issue.status||''),issue])).values()];
    const description=unique.slice(0,5).map(i=>providers[i.provider]+' '+labels[i.kind]+(i.status?' (HTTP '+i.status+')':'')).join(', ');
    const action=unique.some(i=>i.kind==='billing')?'Check the search service’s billing or quota before resuming.':
      unique.some(i=>i.kind==='access'||i.kind==='request')?'Check the project’s search access and configuration before resuming.':
      unique.some(i=>transient.has(i.kind))?'Resume after the search service recovers.':'Resume to try the search again.';
    super('Public search was interrupted. '+(description?description+'. ':'')+action,503);
    this.issues=unique;
  }
}

export function searchRetry(issues,remainingMs) {
  if(!issues.length||issues.some(i=>!transient.has(i.kind)))return null;
  const issue=issues[0];
  const cooldown=Math.max(...issues.filter(i=>i.provider===issue.provider).map(i=>i.retryAfterMs||0));
  const delay=Math.max(1000,cooldown);
  // A long Retry-After must be honored outside this serverless invocation.
  if(delay>3500||remainingMs<delay+6000)return null;
  return {provider:issue.provider,delay};
}
