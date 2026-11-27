import {BUSINESS_MEMORY_LIMITS,changeBusinessMemory,projectBusinessMemory} from './business-memory.mjs';

const scope='(?:all (?:of )?(?:my |our |the )?bots|(?:my |our |the )?(?:account(?:-wide)?|workspace(?:-wide)?))';
const memory='(?:(?:my|our|the) )?(?:(?:account|workspace)(?:-wide)? )?(?:business|company|sales) (?:memory|profile)';
const commands=[
  new RegExp('^(?:please )?(?:remember|save)(?: this)? (?:for|across) '+scope+'(?:[,:]\\s*|\\s+(?:that\\s+)?)','i'),
  new RegExp('^(?:please )?(?:save|add|store|remember)(?: this)? (?:to|in) '+memory+'(?:[,:]\\s*|\\s+that\\s+)','i'),
  new RegExp('^(?:for|across) '+scope+'[,]?\\s+(?:please )?(?:remember|save)(?: that| this)?[,:]?\\s+','i')
];
const ending=new RegExp('^'+'(?:please )?remember (?:that )?([\\s\\S]+?) (?:for|across) '+scope+'[.!]?$','i');
const labels=[
 ['company',/^(?:company(?: name)?|business name)$/i],
 ['productsServices',/^(?:products?(?: and services)?|services|offering)$/i],
 ['salesProposition',/^(?:value proposition|sales proposition|positioning|sales pitch)$/i],
 ['proof',/^(?:proof(?: points?)?|approved claims?|references)$/i],
 ['buyerTargeting',/^(?:target buyers?|target audience|ideal customers?|buyer targeting|icp)$/i],
 ['voice',/^(?:tone|brand voice|voice|writing style)$/i],
 ['restrictions',/^(?:restrictions?|limits?|prohibited claims?)$/i]
];
const labelsForUser={company:'company',productsServices:'products and services',salesProposition:'sales proposition',proof:'proof points',buyerTargeting:'buyer targeting',voice:'voice',restrictions:'restrictions'};
const help='Which fact should I save for all your bots? For example, “Save to business memory: Products: …”.';
export function parseBusinessMemoryCommand(message) {
  if(typeof message!=='string')return null;
  const s=message.trim();
  const prefix=commands.find(pattern=>pattern.test(s));
  const match=prefix?null:s.match(ending);
  if(!prefix&&!match)return null;
  let fact=(prefix?s.replace(prefix,''):match[1]).trim().replace(/^that\s+/i,'');
  const explicit=fact.match(/^([^:\n]{1,40}):\s*([\s\S]+)$/);
  let field=explicit&&labels.find(([,pattern])=>pattern.test(explicit[1].trim()))?.[0];
  if(field)fact=explicit[2].trim();
  if(!fact||/^(?:what if|for example|as an example|hypothetically|imagine|suppose|e\.g\.|if\b)/i.test(fact)||fact.endsWith('?'))return {kind:'clarify',prompt:help};
  if(!field){
    if(/^(?:our|my) (?:company|business)(?: name)? is (?:called )?/i.test(fact)){
      field='company';fact=fact.replace(/^(?:our|my) (?:company|business)(?: name)? is (?:called )?/i,'').replace(/\.$/,'').trim();
    }else if(/^(?:we|our company) (?:sell|make|manufacture|offer|produce|supply|provide)\b/i.test(fact))field='productsServices';
    else if(/^(?:we (?:target|serve)|our (?:buyers|target customers|ideal customers) (?:are|include))\b/i.test(fact))field='buyerTargeting';
    else if(/^(?:(?:do not|don't|don’t|never) (?:claim|promise|mention|offer)|we (?:never|cannot|can't) (?:claim|promise|offer))\b/i.test(fact))field='restrictions';
    else if(/^(?:our (?:tone|voice|style) is|write (?:briefly|formally|informally|in )|use (?:a |an )?(?:plain|concise|casual|formal))\b/i.test(fact))field='voice';
    else return {kind:'clarify',prompt:help};
  }
  return {kind:'save',field,fact};
}
export function applyBusinessMemoryCommand(workspace,agent,command){
  if(command.kind==='clarify')return command.prompt;
  const {field,fact}=command;
  const prior=projectBusinessMemory(workspace.businessMemory);
  if(prior[field]===fact||prior[field].split('\n').includes(fact))return 'That fact is already in '+labelsForUser[field]+' for all your bots.';
  if(field==='company'&&prior.company)return 'Your shared company name is already “'+prior.company+'”. You can replace it in Business memory.';
  const next=prior[field]?prior[field]+'\n'+fact:fact;
  if(next.length>BUSINESS_MEMORY_LIMITS[field])return 'The '+labelsForUser[field]+' field is full. Edit it in Business memory to make room for this fact.';
  changeBusinessMemory(workspace,{expectedVersion:prior.version,fields:{[field]:next}});
  return 'Saved in '+labelsForUser[field]+' for all your bots: “'+fact+'”';
}
