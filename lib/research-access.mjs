import {note} from './domain.mjs';
import {normalizeSearchSource,selectedSearchSources,SEARCH_SOURCE_CHOICES} from './search-source.mjs';
import {sourceStates} from './source-states.mjs';
export const isPrivateSource=value=>['linkedin','sales_navigator'].includes(normalizeSearchSource(value));
export function publicJobAuthorized(b,request={}) {
  const selected=selectedSearchSources(b);
  if(selected.length||Array.isArray(b.searchSources))return selected.includes('web');
  const job=b.researchJob;
  return !request.scheduled&&(!b.searchGate||job?.searchSource==='web')&&!!b.researchRequestedAt&&job?.id===b.researchRequestedAt&&
    (!request.requestedAt||job.id===request.requestedAt)&&(!job.searchSource||job.searchSource==='web')&&
    ['running','continuing'].includes(job.status);
}
export function showSourceGate(d,b) {
  const sources=selectedSearchSources(b),source=sources[0],onePrivate=sources.length===1&&isPrivateSource(source);
  const question=sources.length?Object.values(sourceStates(d,b)).map(v=>v.summary).join(' '):
    'Where should I look for these prospects? Choose any combination of the public web, LinkedIn, Sales Navigator, RocketReach and email.';
  if(!sources.length&&publicJobAuthorized(b)&&b.researchJob)b.researchJob.searchSource='web';
  b.searchGate={status:!sources.length?'awaiting_source':onePrivate?'awaiting_selection':'sources_selected',source,sources,question};
  note(d,b.id,'assistant',question);d.messages.at(-1).details=!sources.length?{type:'sourceChoice',choices:SEARCH_SOURCE_CHOICES}:
    onePrivate?{type:'browserConnection',source}:{type:'research',sources};
}
