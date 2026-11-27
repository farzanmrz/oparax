import test from 'node:test';
import assert from 'node:assert/strict';
import {planCommand,writeDraft} from '../lib/conversation-model.mjs';

const who={id:'lead-1',person:'Rose Baker',role:'Buyer',company:'Example Footwear',evidence:'Public buyer listing',secret:'must not reach gateway'};
const agent={name:'Buying research',brief:'Footwear buyers',researchJob:{qualified:1,goal:50,seen:['private index records']},mailboxSecret:'do not disclose'};
const reply=value=>async()=>JSON.stringify(value);

test('commands accept actionable new and revised briefs and reject unsupported operations',async()=>{
  const args={message:'Find 12 footwear buyers and designers employed by Barbour'};
  const expected={action:'research',name:'Barbour buyers and designers',brief:args.message};
  const seen=[];
  assert.deepEqual(await planCommand(args,async(m,opts)=>{seen.push(opts.modelId);return JSON.stringify(expected);}),expected);
  assert.equal(seen[0],process.env.OUTREACH_COMMAND_MODEL||'openai/gpt-6.2-astra');
  assert.equal((await planCommand({...args,agent},reply({...expected,action:'refine'}))).action,'refine');
  await assert.rejects(planCommand(args,reply({action:'send',email:'sample@example.com'})),/incomplete response/);
  assert.equal((await planCommand(args,reply({action:'answer',answer:"Done! I've emailed the prospect."}))).action,'clarify');
  assert.equal((await planCommand(args,reply({action:'answer',answer:'The research schedule is paused.'}))).action,'answer');
});

test('router scrubs internal data and limits draft recipients to supplied records',async()=>{
  const args={message:'Draft an email to Rose Baker',agent,prospects:[who]};
  assert.deepEqual(await planCommand(args,async(messages)=>{
    const input=JSON.parse(messages[1].content);
    assert.equal(input.prospects[0].id,who.id);
    assert.equal(input.agent.run.qualified,1);
    assert.doesNotMatch(JSON.stringify(input),/private index records|must not reach gateway|do not disclose/);
    return JSON.stringify({action:'draft',prospectId:who.id,channel:'email'});
  }),{action:'draft',prospectId:who.id,channel:'email'});
  assert.equal((await planCommand(args,reply({action:'draft',prospectId:'outside-workspace'}))).action,'clarify');
});

test('draft routing resolves explicit names and requires clarification for indistinguishable names',async()=>{
  const sameName={...who,id:'other',company:'Other Company'};
  const args={message:'Write Rose Baker a LinkedIn note',agent,prospects:[who,sameName]};
  const model=reply({action:'draft',prospectId:who.id,channel:'linkedin'});
  assert.equal((await planCommand(args,model)).action,'clarify');
  assert.equal((await planCommand({...args,message:'Write a note to Rose Baker at Example Footwear'},model)).action,'draft');
  assert.equal((await planCommand({...args,prospects:[who,{...sameName,person:'Someone Else'}]},reply({action:'draft',prospectId:'other'}))).action,'clarify');
});

test('draft output is constrained to the requested channel and stored as plain text',async()=>{
  const args={agent,prospect:who,message:'Write a brief email about UK leather supply',channel:'both'};
  const output=await writeDraft(args,reply({subject:'Supply\nquestion',body:'Hi Rose, who handles UK leather sourcing?',linkedin:'Hi Rose, do you handle UK leather sourcing?',send:true}));
  assert.equal(output.subject,'Supply question');assert.equal(output.send,undefined);
  assert.deepEqual(await writeDraft({...args,channel:'linkedin'},reply(output)),{linkedin:output.linkedin});
  await assert.rejects(writeDraft(args,reply({subject:'No body'})),/incomplete response/);
});
