const personalDomain=/^(?:(?:gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|gmx|protonmail|proton|fastmail|mail|mailinator|guerrillamail|yandex|qq|163|126)\.[a-z.]+|pm\.me)$/i;
export function workDomain(value) {
  if(typeof value!=='string')return '';
  const trimmed=value.trim().toLowerCase();
  if(trimmed.length>253||/[\s@:*?#%\\]/.test(trimmed.replace(/^https?:\/\//,'')))return '';
  const domain=trimmed.replace(/^https?:\/\//,'').replace(/\/$/,'').replace(/^www\./,'');
  return /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)&&!personalDomain.test(domain)?domain:'';
}
export const mailboxBriefSignature=agent=>JSON.stringify([agent?.brief||'',agent?.clarifications||[]]);
export function mailboxScopeSuggestion(agent={}) {
  const remembered=agent.mailboxResearchConsent;
  const rememberedCurrent=remembered&&(!remembered.signature||remembered.signature===mailboxBriefSignature(agent));
  if(rememberedCurrent&&remembered.domain)return {company:remembered.company,domain:remembered.domain,days:remembered.days||7,mailboxKind:remembered.mailboxKind||'connected'};
  const projected=agent.mailboxScopeSuggestion;
  if(projected?.domain||projected?.company)return {...projected};
  const job=agent.researchJob||{};
  const plan=job.planSignature&&job.planSignature!==mailboxBriefSignature(agent)?{}:job.plan||{};
  const contexts=plan.companyContexts||[],employers=plan.employers||[];
  const proofs=Object.values(job.companyProofs||{}).filter(p=>p?.name&&p.source);
  const company=employers.length===1?employers[0]:!employers.length&&proofs.length===1?proofs[0].name:'';
  const context=contexts.find(c=>c.company?.toLowerCase()===company.toLowerCase());
  const proof=proofs.find(p=>p.name.toLowerCase()===company.toLowerCase());
  const brief=[agent.brief,...(agent.clarifications||[]).map(c=>c.answer)].filter(Boolean).join(' ');
  const domains=[...new Set((brief.match(/(?:https?:\/\/)?(?:[a-z\d-]+\.)+[a-z]{2,}(?![\w.])/gi)||[]).map(workDomain).filter(Boolean))];
  let officialSource='';
  if(proof)try {
    const host=workDomain(new URL(proof.source).hostname);
    const brand=company.toLowerCase().replace(/[^a-z0-9]/g,'');
    if(brand&&host.split('.')[0].replace(/-/g,'')===brand)officialSource=host;
  }catch{}
  const rawDomain=proof?.domain||context?.domain||officialSource||(!employers.length||employers.length===1?domains.length===1?domains[0]:'':'');
  let display=company;
  if(!display&&employers.length<=1) {
    const named=brief.match(/\b(?:at|company(?: named)?|employer(?: named)?)\s+([A-Z][\p{L}\p{M}’'&.-]*(?:\s+[A-Z][\p{L}\p{M}’'&.-]*){0,4})(?=[,.;:!?\s(]|$)/u);
    display=named?.[1]?.replace(/[.,;]+$/,'')||'';
  }
  return {company:display,domain:workDomain(rawDomain),days:7,mailboxKind:'connected'};
}
