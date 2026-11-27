import {randomUUID} from 'node:crypto';
import {Fault} from './store.mjs';
import {bot} from './domain.mjs';

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const byId=skills=>new Map(skills.map(skill=>[skill.id,skill]));
const sameIds=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));

export function customSkillLibrary(workspace) {
  return (workspace?.customSkills||[]).map(({id,name,instructions,version,updatedAt})=>({id,name,instructions,version,updatedAt}));
}
export function assignedCustomSkillIds(workspace,agent) {
  const available=byId(workspace?.customSkills||[]);
  return [...new Set(agent?.customSkillIds||[])].filter(id=>available.has(id));
}
export function activeCustomSkills(workspace,agent) {
  const available=byId(workspace?.customSkills||[]);
  return assignedCustomSkillIds(workspace,agent).map(id=>{
    const {name,instructions}=available.get(id);
    return {name,instructions};
  });
}
function validIds(ids) {
  return Array.isArray(ids)&&ids.every(id=>typeof id==='string'&&uuid.test(id))&&new Set(ids).size===ids.length;
}
function field(value,max,label) {
  if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new Fault('Enter '+label+' (up to '+max+' characters).');
  return value.trim();
}
function conflict(){throw new Fault('This skill changed in another tab. Reload the latest version before saving.',409);}
export function changeCustomSkills(workspace,input) {
  const skills=workspace.customSkills||[];
  const result=()=>({customSkills:customSkillLibrary(workspace)});
  if(input.action==='assign'){
    const agent=bot(workspace,input.agentId);
    const wanted=input.skillIds,expected=input.expectedSkillIds;
    if(!validIds(wanted)||!validIds(expected)||wanted.length>12)throw new Fault('Choose up to 12 saved skills for this bot.');
    const valid=byId(skills);
    if(wanted.some(id=>!valid.has(id)))throw new Fault('One of the selected skills no longer exists. Refresh the list.',409);
    const current=assignedCustomSkillIds(workspace,agent);
    if(!sameIds(current,wanted)&&!sameIds(current,expected))throw new Fault('This bot’s skills changed in another tab. Refresh before applying.',409);
    agent.customSkillIds=[...wanted];
    return {...result(),agentId:agent.id,customSkillIds:agent.customSkillIds};
  }
  if(!['save','remove'].includes(input.action))throw new Fault('Choose a skill action.');
  if(input.action==='remove'&&!input.id)throw new Fault('Choose a saved skill to remove.');
  const id=input.id??randomUUID();
  if(!uuid.test(id)||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0)throw new Fault('Choose the current version of a sales skill.');
  const index=skills.findIndex(skill=>skill.id===id);
  const existing=skills[index];
  if(input.action==='remove'){
    if(!existing)return result();
    if(existing.version!==input.expectedVersion)conflict();
    workspace.customSkills=skills.filter(skill=>skill.id!==id);
    for(const b of workspace.bots||[])if(b.customSkillIds?.includes(id))b.customSkillIds=b.customSkillIds.filter(item=>item!==id);
    return result();
  }
  const name=field(input.name,96,'a skill name');
  const instructions=field(input.instructions,4000,'instructions');
  if(existing?.name===name&&existing.instructions===instructions)return result();
  if((existing?.version||0)!==input.expectedVersion)conflict();
  if(!existing&&skills.length>=100)throw new Fault('This workspace already has 100 sales skills.');
  const record={id,name,instructions,updatedAt:new Date().toISOString(),version:(existing?.version||0)+1};
  workspace.customSkills=existing?skills.map(skill=>skill.id===id?record:skill):[...skills,record];
  return result();
}
