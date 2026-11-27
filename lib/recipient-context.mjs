import {text} from './domain.mjs';

const fold=value=>text(value,5000).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();

// Include an explicit name and the preceding draft before general matches. Preserve ties
// so an ambiguous first name can be clarified by the validated sales command.
export function recipientContext(prospects,message,previousId,{limit=100,relevantOnly=false}={}){
  const words=' '+fold(message)+' ';
  const contains=value=>!!value&&words.includes(' '+value+' ');
  const rank=p=>{
    const name=fold(p.person);
    if(contains(name))return 6;
    if(p.id===previousId)return 5;
    if(name.split(' ').some(w=>w.length>2&&contains(w)))return 4;
    if(contains(fold(p.role))&&contains(fold(p.company)))return 3;
    if(contains(fold(p.company))||contains(fold(p.role)))return 2;
    return 0;
  };
  return (prospects||[]).filter(p=>p?.id&&p.person).map(p=>({p,rank:rank(p)}))
    .filter(item=>!relevantOnly||item.rank>0).sort((a,b)=>b.rank-a.rank).slice(0,limit)
    .map(({p})=>({id:p.id,person:text(p.person,120),company:text(p.company,150),role:text(p.role,160)}));
}
