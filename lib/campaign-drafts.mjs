import {text} from './domain.mjs';
import {decodeObject} from './research.mjs';
import {resolveAgentModel} from './agent-models.mjs';
import {sellerInstructions,inferenceSeller,unsupportedClaim,outreachGrounds} from './sales-context.mjs';
import {isAiBudgetError,draftBudgetMessage} from './ai-gateway-failure.mjs';

const prompt=`Draft the first email, a concise LinkedIn introduction, and one short follow-up for each verified recipient. Return JSON {"drafts":[{"ref":"exact supplied ref","subject":"plain single line","body":"email","linkedin":"note","followUp":"later email body"}]}. Each message must be plain text, ready to read and tailored to the recipient's verified role. The follow-up will be sent after the initial email. If the task asks for a fact essential to the offer that is absent, return {"ref":"...","question":"one concise question for the workspace owner"} for that person. A request asking for sample pricing cannot establish a price. Do not insert placeholders, fabricate sender details, predict outcomes, imply previous conversations beyond the initial note being followed up, or claim any contact occurred. Do not append a signature with invented details. No need to repeat all supplied facts.`;
const neutralFollowUp=person=>'Hello '+person.split(/\s+/)[0]+',\n\nIs the topic in my earlier note relevant to your work?';
const hasContext=seller=>!!(seller&&(
  Object.values(seller.businessProfile||{}).some(v=>typeof v==='string'&&!!v.trim())||seller.customSkills?.length
));
const trimLine=v=>text(v,180).replace(/[\r\n]+/g,' ');
const safeFacts=row=>({person:text(row.person,120),company:text(row.company,150),role:text(row.role,160),
  evidence:text(row.evidence||row.quote,450),sourceDate:text(row.sourceDate,20)});
const defaultGateway=(...args)=>import('./agent.mjs').then(m=>m.model(...args));

function validCopy(row){
  const subject=trimLine(row?.subject),body=text(row?.body,3500),linkedin=text(row?.linkedin,1500),followUp=text(row?.followUp,2000);
  return subject&&body&&linkedin&&followUp?{subject,body,linkedin,followUp}:null;
}
async function generate(rows,seller,brief,gateway,timeout){
  const recipients=rows.map((row,i)=>({ref:String(i),...safeFacts(row)}));
  const answer=await gateway([{role:'system',content:prompt+' '+sellerInstructions},
    {role:'user',content:JSON.stringify({brief:text(brief,2500),seller:inferenceSeller(seller),recipients})}],
    {...resolveAgentModel(seller,{task:'draft'}),agentId:seller?.agentId,effort:'low',timeout,maxTokens:4000});
  return decodeObject(answer)?.drafts;
}
// This operates only on newly verified in-memory candidates. It never edits previously saved messages.
export async function prepareCampaignDrafts(rows,seller,{brief='',gateway=defaultGateway,deadline=Infinity}={}){
  const explicitOffer=/\b(?:we|I) (?:offer|sell|supply|manufacture|produce)\b|\bour (?:offer|product|service) is\b/i.test(brief);
  if(!rows.length||seller?.draftEnabled===false||!hasContext(seller)&&!explicitOffer)return;
  const groups=[];
  let budgetBlocked=false;
  for(let i=0;i<rows.length;i+=4)groups.push(rows.slice(i,i+4));
  for(let i=0;i<groups.length;i+=3){
    await Promise.all(groups.slice(i,i+3).map(async group=>{
      let drafts=[];
      const timeout=Math.min(23000,deadline-Date.now());
      if(!budgetBlocked&&timeout>=3500){
        try{const result=await generate(group,seller,brief,gateway,timeout);if(Array.isArray(result))drafts=result;}
        catch(error){if(isAiBudgetError(error))budgetBlocked=true;}
      }
      for(const [index,record] of group.entries()){
        const matching=drafts.filter(v=>String(v?.ref)===String(index));
        const item=matching.length===1?matching[0]:null;
        let question=text(item?.question,400);
        const copy=!question&&validCopy(item);
        if(copy&&unsupportedClaim(Object.values(copy).join(' '),outreachGrounds(seller,record,brief)))question='Which price, figure or link is approved for this outreach?';
        if(copy&&!question){Object.assign(record,copy);continue;}
        // Research can publish the verified person if copy generation failed. Hold automatic delivery until suitable copy is available.
        record.subject='';record.body='';record.linkedin='';
        record.draftQuestion=question||(budgetBlocked?draftBudgetMessage:'The tailored draft is unavailable. Ask the agent to prepare a new message for this prospect.');
      }
    }));
  }
  if(budgetBlocked)return {reason:'model_budget'};
}
export async function composeFollowUp(lead,seller,brief,gateway=defaultGateway){
  if(lead.followUp?.trim())return {body:lead.followUp};
  if(seller?.draftEnabled===false)return {question:'Enable outreach drafting to prepare a new follow-up.'};
  if(!hasContext(seller))return {body:neutralFollowUp(lead.person)};
  const recipient=safeFacts(lead),previousEmail={subject:text(lead.subject,180),body:text(lead.body,3500)};
  try{
    const raw=await gateway([{role:'system',content:`Write a single short plain-text follow-up to the previousEmail for the verified recipient. Preserve the original topic and promises. Apply relevant sender facts and voice. Reference only supplied facts. Return JSON {body} or {question} with one concrete question for the owner if an essential fact is missing. `+sellerInstructions},
      {role:'user',content:JSON.stringify({seller:inferenceSeller(seller),brief:text(brief,2500),recipient,previousEmail})}],
      {...resolveAgentModel(seller,{task:'draft'}),agentId:seller?.agentId,effort:'low',timeout:16000,maxTokens:500});
    const result=decodeObject(raw),question=text(result.question,400),body=text(result.body,2000);
    if(question)return {question};
    if(body&&unsupportedClaim(body,outreachGrounds(seller,lead,brief)+' '+previousEmail.body))return {question:'Which price, figure or link should I use in this follow-up?'};
    if(body)return {body};
  }catch(error){if(isAiBudgetError(error))return {question:draftBudgetMessage};}
  return {question:'The follow-up could not be prepared. Review this prospect’s message before sending.'};
}
