import test from 'node:test';
import assert from 'node:assert/strict';
import {changeCustomSkills,activeCustomSkills} from '../lib/custom-skills.mjs';
import {parseBusinessMemoryCommand,applyBusinessMemoryCommand} from '../lib/business-memory-chat.mjs';

test('a shared skill is scoped to assigned bots and follows the latest saved version',()=>{
 const d={bots:[{id:'a'},{id:'b'}]},other={bots:[{id:'a'}]};
 const id='af8201d4-60c2-4d3a-b155-848453918ddc';
 const add={action:'save',id,name:'Buyer introduction',instructions:'Ask whether they source footwear.',expectedVersion:0};
 changeCustomSkills(d,add);changeCustomSkills(d,add);
 assert.equal(d.customSkills.length,1);
 changeCustomSkills(d,{action:'assign',agentId:'a',skillIds:[id],expectedSkillIds:[]});
 assert.equal(activeCustomSkills(d,d.bots[0])[0].name,add.name);assert.deepEqual(activeCustomSkills(other,d.bots[0]),[]);
 assert.deepEqual(activeCustomSkills(d,d.bots[1]),[]);
 changeCustomSkills(d,{...add,expectedVersion:1,instructions:'Offer a sample.'});
 assert.throws(()=>changeCustomSkills(d,{...add,instructions:'Stale.',expectedVersion:1}),e=>e.status===409);
 assert.equal(activeCustomSkills(d,d.bots[0])[0].instructions,'Offer a sample.');
 assert.throws(()=>changeCustomSkills(d,{action:'remove',id,expectedVersion:1}),e=>e.status===409);
 changeCustomSkills(d,{action:'remove',id,expectedVersion:2});
 assert.deepEqual(d.bots[0].customSkillIds,[]);assert.deepEqual(d.customSkills,[]);
});
test('only an explicit account-wide instruction can teach business facts from chat',()=>{
 const d={};const agent={};
 for(const s of ['Could I save this to business memory?','Find companies like us','Do not remember for all our bots that we sell cotton.','Example: remember for all my bots that we sell cotton.']){
  assert.equal(parseBusinessMemoryCommand(s),null);
 }
 for(const s of ['Remember for all my bots that we sell leather.','Save to business memory: Products: We supply finished shoes.','Remember that we make belts for all my bots.']){
  const action=parseBusinessMemoryCommand(s);assert.equal(action.field,'productsServices');applyBusinessMemoryCommand(d,agent,action);
 }
 assert.equal(d.businessMemory.version,3);assert.match(d.businessMemory.productsServices,/finished shoes/);
 const hypothetical=parseBusinessMemoryCommand('Remember for all my bots: for example, we make jackets.');
 assert.equal(hypothetical.kind,'clarify');applyBusinessMemoryCommand(d,agent,hypothetical);assert.equal(d.businessMemory.version,3);
});
