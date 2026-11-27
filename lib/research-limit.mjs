// Read only a positive instruction about the size of this result set. A number
// that the planner copied from a product fact, hypothetical or example is inert.
const units='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const small=units.slice(1).join('|');
const words='(?:(?:'+tens.slice(2).join('|')+')(?:[- ](?:'+units.slice(1,10).join('|')+'))?|'+small+')';
const number='(?:\\d+(?:,\\d{3})*|(?:one|two|three|four|five|six|seven|eight|nine) hundred(?: (?:and )?'+words+')?|'+words+')';
const action='(?:find|identify|research|discover|return|list|give|show|get|collect|source|save|target|provide|want|need)';
const cap='(?:up to|no more than|at most|a maximum of|a limit of|exactly)';
const request=new RegExp('\\b(?:'+action+'(?: me| us)?(?: the)?(?: (?:first|top|'+cap+'))?|(?:limit|cap)(?: (?:the |my |our )?(?:search|results?|list|contacts?|prospects?|leads?))? (?:to|at)|'+cap+')\\s+('+number+')\\b','gi');
const countNoun=/^(?:distinct |verified |qualified |named |relevant |senior |junior |individual |potential |current |personal |footwear |fashion |relevant )*(?:people|individuals?|profiles?|contacts?|prospects?|leads?|buyers?|employees?|staff|designers?|managers?|directors?|executives?|decision[- ]makers?|engineers?|founders?|owners?|recruiters?|specialists?|heads?|officers?|professionals?|results?|matches?)\b/i;
function value(raw) {
  if(/^\d/.test(raw))return Number(raw.replaceAll(',',''));
  let n=0;
  for(const word of raw.split(/[- ]+/)){
    if(word==='hundred')n*=100;
    else if(word!=='and')n+=Math.max(0,units.indexOf(word),tens.indexOf(word)*10);
  }
  return n;
}
export function researchCeiling(statements,roles=[]) {
  const roleNames=roles.filter(r=>typeof r==='string'&&r.trim()).map(r=>r.toLowerCase().trim());
  for(const statement of [...statements].reverse()){
    const clauses=String(statement||'').toLowerCase().replace(/\be\.g\./g,'for example').split(/[.!?;\n]/);
    for(const clause of clauses.reverse()){
      if(/\b(?:hypothetic\w*|illustrat\w*|for example|for instance|suppose|imagine|such as|if|unless)\b/.test(clause))continue;
      if(/\b(?:no (?:quota|cap|limit)|without (?:a |an )?(?:limit|cap|quota))\b/.test(clause))return null;
      for(const match of [...clause.matchAll(request)].reverse()){
        const before=clause.slice(0,match.index),after=clause.slice(match.index+match[0].length).trimStart();
        // A standalone upper bound is an instruction at a clause boundary; in
        // "suppliers with up to 50 employees" it modifies the employer.
        if(new RegExp('^'+cap+'\\b').test(match[0])&&before.trim()&&!/(?:[,/:]\s*|\b(?:please|maximum(?: is)?|limit(?: is)?|cap(?: is)?)\s*)$/.test(before))continue;
        if(/\b(?:do not|don['’]t|never|cannot|can['’]t|shouldn['’]t|not)\b[^,]{0,65}$/.test(before))continue;
        if(/^(?:%|[-–]|years?\b|million\b|billion\b|companies\b|organizations\b|teams?\b|accounts?\b|dollars?\b)/.test(after))continue;
        const noun=countNoun.test(after)||roleNames.some(role=>after===role||after.startsWith(role+' ')||after.startsWith(role+'s '));
        const limited=/\b(?:up to|no more than|at most|exactly|maximum|limit|cap)\b/.test(match[0]);
        if(!noun&&!(limited&&(!after||/^(?:and |in total\b|at |from |for (?:this|the) (?:run|search)\b)/.test(after))))continue;
        const amount=value(match[1]);
        if(Number.isSafeInteger(amount)&&amount>0)return amount;
      }
    }
  }
  return null;
}
