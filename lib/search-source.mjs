export const SEARCH_SOURCE_CHOICES = Object.freeze([
  Object.freeze({value:'web',label:'Public web'}),
  Object.freeze({value:'linkedin',label:'LinkedIn'}),
  Object.freeze({value:'sales_navigator',label:'Sales Navigator'}),
]);

const clean=value=>typeof value==='string'?value.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/[`*]/g,'').trim():'';
const navigator="(?:(?:linked[ -]*in)(?:'s)?[ _-]+)?sales[ _-]*nav(?:igator)?";
const publicWeb="(?:public(?:ly available)?|open)[ _-]+(?:web(?:[ -]+(?:search|sources?))?|internet|sources?|websites?)|(?:web|internet)(?:[ -]+search)?";
const sourcePattern=new RegExp('\\b(?:'+navigator+'|linked[ -]*in|'+publicWeb+')\\b','gi');
const sourceModifiers = new RegExp("\\b(?:(?:my|our|the|own|connected|authenticated|saved|personal|existing|logged[ -]in|current)\\s+)+(?="+sourcePattern.source+")",'gi');
const navigatorOnly=new RegExp('^(?:'+navigator+')$','i');
const webOnly=new RegExp('^(?:'+publicWeb+')$','i');

export function normalizeSearchSource(raw) {
  const value=clean(raw).replace(/[.!?]$/,'').trim();
  if(navigatorOnly.test(value))return 'sales_navigator';
  if(/^linked[ -]*in$/.test(value))return 'linkedin';
  if(webOnly.test(value))return 'web';
  return '';
}

export function sourceLabel(raw) {
  const source=normalizeSearchSource(raw);
  return SEARCH_SOURCE_CHOICES.find(choice=>choice.value===source)?.label||'';
}

const searchVerb=/\b(?:use|using|search(?:ing)?|research(?:ing)?|check(?:ing)?|query|consult|browse|scan|try|choose|select|prefer|pick)\s+(?:(?:only|just|the|either|between)\s+)*$/;
const origin=/\b(?:through|via|across|from|using|on|in|with)\s+(?:(?:only|just|the)\s+)*$/;
const researchContext=/\b(?:find|finding|search|searching|source|research|researching|discover|pull|look|lookup|check|identify|hunt|prospect|use|gather|data|information)\b/;
const dispatchContext=/\b(?:write|draft|send|message|contact|reach out|email|deliver|post|share|publish|reply|connect)\b/;
const negative=/\b(?:not|never|don't|avoid|exclude|skip|except|rather than|instead of|without)\s+(?:(?:use|using|choose|search|searching|check|look|at|via|on|in|through|only|the)\s+)*$/;
const resultNoun=/^\s+(?:(?:personal|verified|public|profile)\s+)*(?:urls?|links?|drafts?|messages?|notes?|invitations?|connection requests?)\b/;
const sourceSuffix=/^\s+(?:(?:should|will) be|as|is|for)\s+(?:(?:my|our|your|the|this)\s+)*(?:search|research|source|data source|lookup)\b/;
const conjunction=/^\s*(?:(?:,|\/|\+|&|and|or|and\/or)\s*)+(?:(?:only|the|also)\s+)*$/;

function selection(message) {
  const line=clean(message).replace(sourceModifiers,'');
  if(!line)return {source:'',needsChoice:false};
  const bare=line.replace(/^(?:(?:yes|please|okay|ok|let's go with|go with|i(?:'ll| will) take)\b[\s,]*)+/, '')
    .replace(/[,\s]*(?:please|thanks|then|instead|only)?[.!?]*$/,'').trim();
  const exact=normalizeSearchSource(bare);
  if(exact)return {source:exact,needsChoice:false};
  const skeleton=line.replace(sourcePattern,'SOURCE');
  const sourceList=/^(?:please\s+)?(?:SOURCE\s*(?:(?:and|or|and\/or|[+/&,])\s*))+SOURCE[.?!]*$/i.test(skeleton);
  let needsChoice=sourceList||/\b(?:switch|change|pick|choose|select)\s+(?:(?:my|our|the|this|a|different|another|preferred|new|research|search|data)\s+)*sources?\b/.test(line);


  const chosen=new Set();
  let previousEnd=-1,previousSelected=false;
  for(const match of line.matchAll(sourcePattern)) {
    const value=normalizeSearchSource(match[0]),start=match.index,end=start+match[0].length;
    const previous=line.slice(0,start),after=line.slice(end);
    const listItem=previousSelected&&conjunction.test(line.slice(previousEnd,start));
    previousEnd=end;previousSelected=false;
    // A link to return or message to write names an output, not a search service.
    const audienceMention=value==='web'&&/^\s+(?:developers?|designers?|applications?|agencies|hosting)\b/.test(after)||
      value==='linkedin'&&/^\s+(?:employees?|staff|workforce|itself)\b/.test(after);
    const delivery=/^(?:\s+account)?\s+(?:to|for)\s+(?:writ(?:e|ing)|send(?:ing)?|messag(?:e|ing)|draft(?:ing)?|contact(?:ing)?|reaching out|reply(?:ing)?|post(?:ing)?)\b/.test(after);
    if(!value||resultNoun.test(after)||audienceMention||delivery)continue;
    if(negative.test(previous)) {
      if(/\b(?:don't|do not|never|avoid|exclude|skip)\s+(?:(?:use|using|search|research|look|up|from|via|on|in|through|the)\s+)*$/.test(previous))needsChoice=true;
      continue;
    }
    const clause=previous.split(/[.;!?\n]|\b(?:but|then)\b/).at(-1).trimStart();
    if(/\b(?:don't|do not|never)\s+(?:switch|change|move)\b[^.!?;]*$/.test(clause))continue;
    const switching=/\b(?:switch(?:ing)?|chang(?:e|ing)|move)\b[^.!?;]{0,140}\b(?:to|over to)\s*$/.test(clause)&&!dispatchContext.test(clause);
    const switchingFrom=/\b(?:switch(?:ing)?|chang(?:e|ing)|move)\b[^.!?;]{0,50}\bfrom\s*$/.test(clause);
    if(switchingFrom){needsChoice=true;continue;}
    const navigate=/\b(?:go|head|log in|sign in|open|access)\s+(?:(?:in|to|into|on)\s+)?$/.test(clause)&&
      (researchContext.test(clause)||researchContext.test(after.split(/[.;!?\n]/)[0]))&&!dispatchContext.test(clause);
    const byOrigin=origin.test(clause)&&(researchContext.test(clause)||
      /^(?:on|through|in|via|from)\s+(?:the\s+)?$/.test(clause))&&!dispatchContext.test(clause.split(/\band\b/).at(-1));
    const namedSource=/\b(?:search source|source|research platform)\s*(?:(?:is|=|:)\s*)?(?:the\s+)?$/.test(clause);
    const afterChoice=/^\s+(?:only|instead|please)[\s.!?,]*$/.test(after);
    const sourceFirst=!previous.trim()&&/^\s*[,.:;–—-]\s*(?:please\s+)?(?:find|search|look|research|source|identify|discover|pull)\b/.test(after);
    if(searchVerb.test(clause)||switching||navigate||byOrigin||namedSource||sourceSuffix.test(after)||sourceList||sourceFirst||listItem||afterChoice){
      chosen.add(value);previousSelected=true;
    }
  }
  const source=chosen.size===1?[...chosen][0]:'';
  return {source,needsChoice:!source&&(needsChoice||chosen.size>1)};
}

export function explicitSearchSource(message) {
  return selection(message).source;
}

export function requestingSourceChoice(message) {
  return selection(message).needsChoice;
}
