const LIMIT = 100;
const stages = new Set(['started','target','query','source','verification','saved','held','progress','error']);
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

export function activitySnapshot(bot) {
  const job = bot.researchJob, status = job?.status || bot.lastRun?.status || 'idle';
  const events = (job && bot.researchActivityJob === job.id && Array.isArray(bot.researchActivity)
    ? bot.researchActivity : []).slice(-LIMIT).filter(e => stages.has(e?.kind) && typeof e.text === 'string')
    .map(e => ({id:e.id,at:e.at,kind:e.kind,text:e.text.slice(0,600),
      ...(publicSource(e.source) ? {source:publicSource(e.source)} : {})}));
  return {jobId:job?.id || null,status,finished:!job || terminal.has(status),
    goal:job?.goal ?? null,qualified:job?.qualified ?? 0,examined:job?.counts?.candidates ?? 0,events};
}
