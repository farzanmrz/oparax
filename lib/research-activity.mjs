import {limitForContext} from './research-limit.mjs';
const LIMIT = 100;
const stages = new Set(['started','target','query','source','verification','proposed','saved','held','progress','error']);
const terminal = new Set(['goal_met','exhausted','failed','needs_input','cancelled']);

function publicSource(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 1200) return '';
    url.hash = '';
    return url.href;
  } catch { return ''; }
}

export function appendActivity(bot,kind,message,source) {
  const jobId = bot.researchJob?.id;
  if (!jobId || !stages.has(kind) || typeof message !== 'string' || !message.trim()) return;
  if (bot.researchActivityJob !== jobId) {
    bot.researchActivityJob = jobId;
    bot.researchActivity = [];
  }
  const text = message.trim().slice(0,600);
  const url = publicSource(source);
  const previous = bot.researchActivity.at(-1);
  if (previous?.kind === kind && previous.text === text && (previous.source || '') === url) return;
  bot.researchActivity.push({id:crypto.randomUUID(),at:new Date().toISOString(),kind,text,
    ...(url ? {source:url} : {})});
  bot.researchActivity = bot.researchActivity.slice(-LIMIT);
}

export function publicResearchEvents(records) {
  if (!Array.isArray(records)) return [];
  return records.slice(-LIMIT).filter(e => stages.has(e?.kind) && typeof e.text === 'string').map(e => {
    // Early versions recorded the internal model route in the batch-start message.
    const text = e.kind === 'started'
      ? e.text.replace(/^(Started research batch \d+) using [\w.\/-]+\.$/, '$1.')
      : e.text;
    const source = publicSource(e.source);
    return {id:e.id, at:e.at, kind:e.kind, text:text.slice(0,600), ...(source ? {source} : {})};
  });
}

export function activitySnapshot(bot) {
  const job = bot.researchJob, status = job?.status || bot.lastRun?.status || 'idle';
  const events = job && bot.researchActivityJob === job.id ? publicResearchEvents(bot.researchActivity) : [];
  return {jobId:job?.id || null,status,finished:!job || terminal.has(status),
    goal:job?.plan?.limitVersion===2?job.goal:limitForContext(bot,job?.plan?.roles),qualified:job?.qualified ?? 0,examined:job?.counts?.candidates ?? 0,events};
}
