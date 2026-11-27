import {note} from './domain.mjs';
import {normalizeSearchSource,sourceLabel,SEARCH_SOURCE_CHOICES} from './search-source.mjs';

export const isPrivateSource=value=>['linkedin','sales_navigator'].includes(normalizeSearchSource(value));
export function publicJobAuthorized(b,request={}) {
  const selected=normalizeSearchSource(b.searchSource);
  if(selected)return selected==='web';
  // Only a previously queued, identified public-web job can finish after migration.
  // Its authorization belongs to that job alone, never the next campaign or retry.
  const job=b.researchJob;
  return !request.scheduled&&(!b.searchGate||job?.searchSource==='web')&&!!b.researchRequestedAt&&job?.id===b.researchRequestedAt&&
    (!request.requestedAt||job.id===request.requestedAt)&&(!job.searchSource||job.searchSource==='web')&&
    ['running','continuing'].includes(job.status);
}

export function showSourceGate(d,b) {
  const selected=normalizeSearchSource(b.searchSource);
  const isPrivate=isPrivateSource(selected);
  const type=isPrivate?'browserConnection':'sourceChoice';
  const content=isPrivate?'Open your agent computer and search '+sourceLabel(selected)+'. Your target is '+b.brief.replace(/[.!?]+$/,'')+'.'+
    ' Select the people you want there, then import their profile links for verification.':
    'Where should I look for these prospects — the public web, LinkedIn, or Sales Navigator?';
  const details=isPrivate?{type,source:selected}:{type,choices:SEARCH_SOURCE_CHOICES};
  if(!selected&&publicJobAuthorized(b)&&b.researchJob)b.researchJob.searchSource='web';
  b.searchGate={status:isPrivate?'awaiting_selection':'awaiting_source',source:selected,question:content};
  note(d,b.id,'assistant',content);d.messages.at(-1).details=details;
}
