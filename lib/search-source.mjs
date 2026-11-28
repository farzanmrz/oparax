export const SEARCH_SOURCE_CHOICES = Object.freeze([
  Object.freeze({value:'web',label:'Public web'}),
  Object.freeze({value:'linkedin',label:'LinkedIn'}),
  Object.freeze({value:'sales_navigator',label:'Sales Navigator'}),
  Object.freeze({value:'rocketreach',label:'RocketReach'}),
  Object.freeze({value:'email',label:'Email'}),
]);

const clean=value=>typeof value==='string'?value.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/[`*]/g,'').trim():'';
const navigator="(?:(?:linked[ -]*in)(?:'s)?[ _-]+)?sales[ _-]*nav(?:igator)?";
const publicWeb="(?:public(?:ly available)?|general|open)[ _-]+(?:web(?:[ -]+(?:search|sources?))?|internet|sources?|websites?)|(?:web|internet)(?:[ -]+search)?";
const rocket="rocket[ _-]*reach";
const mail="e[ -]?mails?|mailbox|inbox";
const sourcePattern=new RegExp('\\b(?:'+navigator+'|linked[ -]*in|'+publicWeb+'|'+rocket+'|'+mail+')\\b','gi');
const sourceModifiers=new RegExp("\\b(?:(?:my|our|the|own|connected|authenticated|saved|personal|existing|logged[ -]in|current)\\s+)+(?="+sourcePattern.source+")",'gi');
const values=[
  ['sales_navigator',new RegExp('^(?:'+navigator+')$','i')],
  ['linkedin',/^linked[ -]*in$/i],
  ['web',new RegExp('^(?:'+publicWeb+')$','i')],
  ['rocketreach',new RegExp('^(?:'+rocket+')$','i')],
  ['email',new RegExp('^(?:'+mail+')$','i')],
];
const all=SEARCH_SOURCE_CHOICES.map(c=>c.value);

export function normalizeSearchSource(raw) {
  const value=clean(raw).replace(/[.!?]$/,'').trim();
  return values.find(([,regex])=>regex.test(value))?.[0]||'';
}

// Unknown members invalidate the entire selection. An empty array is an explicit choice.
export function normalizeSearchSources(raw) {
  const list=(Array.isArray(raw)?raw:[raw]).map(normalizeSearchSource);
  return list.every(Boolean)?[...new Set(list)]:[];
}

export function selectedSearchSources(agent) {
  return normalizeSearchSources(Array.isArray(agent?.searchSources)?agent.searchSources:agent?.searchSource);
}

// The two public discovery modes share a worker. Only web permits article-led discovery.
export function discoverySource(agent) {
  const selected=selectedSearchSources(agent);
  if(selected.includes('web')&&agent?.skillSettings?.public_research!==false)return 'web';
  if(selected.includes('linkedin')&&agent?.skillSettings?.linkedin_research!==false)return 'linkedin';
  return '';
}

export function sourceLabel(raw) {
  const source=normalizeSearchSource(raw);
  return SEARCH_SOURCE_CHOICES.find(choice=>choice.value===source)?.label||'';
}

const searchVerb=/\b(?:use|using|search(?:ing)?|research(?:ing)?|check(?:ing)?|query|consult|browse|scan|try|choose|select|prefer|pick|include|add|enable|combine|only)\s+(?:(?:only|just|the|also|either|between|both|all(?: of)?|the following)\s+)*$/;
const origin=/\b(?:through|via|across|from|using|on|in|with)\s+(?:(?:only|just|the|both|all(?: of)?)\s+)*$/;
const researchContext=/\b(?:find|finding|search|searching|source|research|researching|discover|pull|look|lookup|check|identify|hunt|prospect|use|gather|data|information)\b/;
const dispatchContext=/\b(?:write|draft|send|message|reach out|deliver|post|share|publish|reply)\b/;
const negative=/\b(?:not|never|don't|avoid|exclude|skip|except(?: for)?|remove|disable|drop|deselect|turn off|rather than|instead of|without)\s+(?:(?:use|using|choose|search|searching|check|look|at|via|on|in|through|only|the|both)\s+)*$/;
const resultNoun=/^\s+(?:(?:personal|verified|public|profile)\s+)*(?:urls?|links?|addresses?|drafts?|messages?|notes?|templates?|invitations?|connection requests?)\b/;
const sourceSuffix=/^\s+(?:(?:should|will) be|as|is|for)\s+(?:(?:my|our|your|the|this)\s+)*(?:search|research|source|data source|lookup)\b/;
const conjunction=/^\s*(?:(?:,|\/|\+|&|and|or|and\/or|alongside|together with|as well as)\s*)+(?:(?:only|the|also)\s+)*$/;
const allChoice= /^(?:please\s+)?(?:all(?: five| 5)?(?: of them| sources)?|every(?: available)? source)(?:[,\s]+please)?[.!?]*$/;
const allInCommand=/\b(?:use|select|enable|include|add|remove|disable|search(?: with| via| through)?|research(?: with| via| through)?)\s+(?:(?:all(?: (?:five|5))?|every available)\s+(?:research\s+|search\s+|data\s+)?sources?\b|all (?:five|5)(?=\s*(?:$|[.!?,]|except\b|for (?:this|that|my|the) search\b)))/;
const empty=ambiguous=>({sources:[],mode:null,ambiguous:!!ambiguous});

export function parseSearchSources(message) {
  const line=clean(message).replace(sourceModifiers,'').replace(/\b(?:a |the )?(?:mix|combination|mixture|blend) of\s+/g,'');
  if(!line)return empty(false);
  const bare=line.replace(/^(?:(?:yes|please|okay|ok|let's go with|go with|i(?:'ll| will) take)\b[\s,]*)+/, '')
    .replace(/[,\s]*(?:please|thanks|then|instead|only)?[.!?]*$/,'').trim();
  const exact=normalizeSearchSource(bare);
  if(exact)return {sources:[exact],mode:/\b(?:only|instead)\b/.test(line)?'replace':'add',ambiguous:false};

  const skeleton=line.replace(sourcePattern,'SOURCE');
  const pureList=/^(?:(?:please|both|all(?: of)?)\s+)*(?:SOURCE\s*(?:(?:and|or|and\/or|[+/&,])\s*)+)+SOURCE(?:\s+(?:together|please|only))?[.?!]*$/i.test(skeleton);
  const chooseAll=allChoice.test(line)||allInCommand.test(line)||/^all (?:five|5) except\b/.test(line);
  const allRemoved=chooseAll&&/\b(?:remove|disable|drop|deselect|turn off)\s+all\b/.test(line);
  const genericChange=/\b(?:switch|change|pick|choose|select)\s+(?:(?:my|our|the|this|a|different|another|preferred|new|research|search|data)\s+)*sources?\b/.test(line);
  let ambiguous=false,alternative=false,explicitSwitch=false,explicitAdd=false,explicitOnly=false;
  let previousEnd=-1,previousMode='';
  const positives=new Set(),removals=new Set();
  for(const match of line.matchAll(sourcePattern)) {
    const value=normalizeSearchSource(match[0]),start=match.index,end=start+match[0].length;
    const previous=line.slice(0,start),after=line.slice(end),gap=line.slice(previousEnd,start);
    const listMode=previousMode&&conjunction.test(gap)?previousMode:'';
    previousEnd=end;previousMode='';
    const audience=value==='web'&&/^\s+(?:developers?|designers?|applications?|agencies|hosting)\b/.test(after)||
      value==='linkedin'&&/^\s+(?:employees?|staff|workforce|itself)\b/.test(after);
    const delivery=/^(?:\s+account)?\s+(?:to|for)\s+(?:writ(?:e|ing)|send(?:ing)?|messag(?:e|ing)|draft(?:ing)?|contact(?:ing)?|reaching out|reply(?:ing)?|post(?:ing)?)\b/.test(after);
    const emailVerb=value==='email'&&/^\s+(?:me|us|them|him|her|you|the\s+(?:team|report|list|results)|it)\b/.test(after);
    const outputProfile=/\b(?:return|include|attach|provide|show|save|with)\s+(?:(?:their|a|the|verified|personal|direct)\s+)*$/.test(previous)&&/^\s+profiles?\b/.test(after);
    if(!value||resultNoun.test(after)||audience||delivery||emailVerb||outputProfile)continue;
    const clause=previous.split(/[.;!?\n]|\b(?:but|then)\b/).at(-1).trimStart();
    if(/\b(?:don't|do not|never)\s+(?:switch|change|move)\b[^.!?;]*$/.test(clause))continue;
    if(/\b(?:who|that|which)\s+(?:currently\s+)?(?:use|uses|using)\s*$/.test(clause))continue;
    const switching=/\b(?:switch(?:ing)?|chang(?:e|ing)|move|replace)\b[^.!?;]{0,140}\b(?:to|over to|with)\s*$/.test(clause)&&!dispatchContext.test(clause);
    if(/\b(?:switch(?:ing)?|chang(?:e|ing)|move)\b[^.!?;]{0,50}\bfrom\s*$/.test(clause)||/\breplace\s*$/.test(clause)){
      explicitSwitch=true;continue;
    }
    const removing=negative.test(previous);
    const researchExclusion=/\b(?:return|include|provide|show|display|want)\b/.test(clause)&&/^\s+(?:profiles?|data in the (?:report|list))\b/.test(after);
    if(removing&&!researchExclusion||listMode==='remove'){
      removals.add(value);previousMode='remove';continue;
    }
    const navigate=/\b(?:go|head|log in|sign in|open|access)\s+(?:(?:in|to|into|on)\s+)?$/.test(clause)&&
      (researchContext.test(clause)||researchContext.test(after.split(/[.;!?\n]/)[0]))&&!dispatchContext.test(clause);
    const byOrigin=origin.test(clause)&&(researchContext.test(clause)||/^(?:on|through|in|via|from)\s+(?:the\s+)?$/.test(clause))&&!dispatchContext.test(clause.split(/\band\b/).at(-1));
    const namedSource=/\b(?:search sources?|sources?|research platform)\s*(?:(?:are|is|=|:)\s*)?(?:the\s+)?$/.test(clause);
    const afterChoice=/^\s+(?:only|instead|please)[\s.!?,]*$/.test(after);
    const sourceFirst=!previous.trim()&&/^\s*[,.:;–—-]\s*(?:please\s+)?(?:find|search|look|research|source|identify|discover|pull)\b/.test(after);
    const positive=searchVerb.test(clause)||switching||navigate||byOrigin||namedSource||sourceSuffix.test(after)||pureList||sourceFirst||listMode==='add'||afterChoice;
    if(!positive)continue;
    positives.add(value);previousMode='add';
    if(listMode&&/\bor\b|\//.test(gap)||/\b(?:between|either)\s*$/.test(clause))alternative=true;
    if(switching||/\binstead\b/.test(after.slice(0,12)))explicitSwitch=true;
    if(/\b(?:also|add|additionally|alongside|too|as well as)\b/.test(clause)||/^\s+(?:too|as well)\b/.test(after))explicitAdd=true;
    if(/\b(?:only|just)\s+(?:(?:use|search|in|on|via|the)\s+)*$/.test(clause)||/^\s+only\b/.test(after))explicitOnly=true;
  }
  if(alternative||(/\beither\b|\bchoose between\b/.test(line)&&positives.size>1))return empty(true);
  if(chooseAll){
    const sources=allRemoved?[...all]:all.filter(s=>!removals.has(s));
    return {sources,mode:allRemoved?'remove':'replace',ambiguous:false};
  }
  if(positives.size&&removals.size){
    if(/\b(?:and|then)\s+(?:add|remove|enable|disable)\b/.test(line))return empty(true);
    for(const s of removals)if(positives.has(s))return empty(true);
    explicitSwitch=true;
  }
  if(positives.size){
    const mode=explicitSwitch||explicitOnly||positives.size>1&&!explicitAdd?'replace':'add';
    return {sources:[...positives],mode,ambiguous:false};
  }
  if(removals.size)return {sources:[...removals],mode:'remove',ambiguous:false};
  ambiguous=genericChange||explicitSwitch;
  return empty(ambiguous);
}

// Single-source callers must not turn removal or a multi-source selection into permission.
export function explicitSearchSource(message) {
  const result=parseSearchSources(message);
  return result.mode!=='remove'&&result.sources.length===1?result.sources[0]:'';
}

export function requestingSourceChoice(message) {
  const result=parseSearchSources(message);
  return result.ambiguous||result.mode==='remove'||result.sources.length>1;
}
