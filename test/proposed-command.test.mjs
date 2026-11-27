import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCommandProposal} from '../lib/conversation-model.mjs';
const agent={id:'agent',brief:'Find footwear buyers at Barbour.'};
const prospects=[{id:'jane',person:'Jane Cole',role:'Buyer',company:'Barbour'},{id:'james',person:'James Noor',role:'Designer',company:'Other'}];
const check=(message,proposal,extra={})=>validateCommandProposal({message,agent,prospects,history:[],...extra},proposal);

test('routine Eve proposals reuse the saved-intent validation without another model and cannot supply a new search target',()=>{
  assert.deepEqual(check('Where are we on that search?',{action:'status'}),{action:'status'});
  assert.deepEqual(check('Show the people we found.',{action:'results'}),{action:'results'});
  const single=check('Find 12 footwear buyers at Barbour',{action:'research',name:'Footwear buyers',brief:'Find everybody at a different company',source:'rocketreach'},{agent:null});
  assert.equal(single.brief,'Find 12 footwear buyers at Barbour');assert.equal(single.source,undefined);
  assert.equal(check('Barbour buyers and designers',{action:'research',brief:'nonsense'},{agent:null}).action,'research');
  assert.equal(check('Who are the buyers at Barbour?',{action:'research'},{agent:null}).action,'research');
  assert.equal(check('Continue the research',{action:'research',brief:'Unauthorized extra targets'}).brief,agent.brief);
  const relative=check('Only London buyers',{action:'refine',brief:'American executives'});
  assert.equal(relative.action,'refine');assert.equal(relative.brief,agent.brief+'\nLatest instruction: Only London buyers');
  assert.deepEqual(check('Is this a sales bot?',{action:'answer',answer:'Yes, it researches verified prospects.'}),{action:'answer',answer:'Yes, it researches verified prospects.'});
});

test('unsafe, malformed, hypothetical, negative and embedded Eve proposals become clarification without dispatch',()=>{
  for(const [message,proposal] of [
    ['What is a good market?','bad'],['Could you draft an email?',null],['Find buyers',{action:'delete_all'}],['What do you do?',{action:'answer',answer:''}],
    ['How do LinkedIn searches work?',{action:'research',brief:'Scan all profiles'}],
    ['Please do not research further',{action:'research',brief:'Find buyers'}],
    ['“Find people at Acme” is the line in their website',{action:'research',brief:'Find people at Acme'}],
    ['Make it shorter',{action:'refine',brief:'Research other people'}],
    ['Add a joke',{action:'refine',brief:'Research other people'}],
    ['What do you think of this person?',{action:'send',channel:'email',prospectId:'jane',concrete:true}],
    ['How should I write to Jane?',{action:'draft',channel:'email',prospectId:'jane'}],
    ['Email Jane Cole about sample sizes',{action:'send',channel:'email',prospectId:'james',concrete:true}],
    ['Write a LinkedIn note to Jane Cole',{action:'draft',channel:'both',prospectId:'jane'}],
    ['Send the email later',{action:'send',channel:'email',prospectId:'jane',existingDraft:true}],
    ['How is it going?',{action:'answer',answer:"I've sent the email."}],
  ]){
    const intent=check(message,proposal);assert.equal(intent.action,'clarify',message);assert.equal(intent.invalidProposal,true,message);
  }
});

test('direct authorized recipient and channel are retained; ambiguous or other workspace records never qualify',()=>{
  assert.deepEqual(check('Write an email to Jane Cole about product design',{action:'draft',channel:'email',prospectId:'jane'}),
    {action:'draft',channel:'email',prospectId:'jane'});
  assert.equal(check("Draft an email to Jane Cole but don't send it",{action:'draft',channel:'email',prospectId:'jane'}).action,'draft');
  assert.equal(check("Find buyers at Nike; don't contact anyone",{action:'research'}).action,'research');
  const send=check('Email Jane Cole about sample sizes',{action:'send',channel:'email',prospectId:'jane',concrete:true,purpose:'a made-up offer'});
  assert.equal(send.action,'send');assert.equal(send.purpose,'');
  assert.equal(check('Email Jane Cole about samples',{action:'send',channel:'linkedin',prospectId:'jane',concrete:true}).action,'clarify');
  assert.equal(check('Email Jane Cole about samples',{action:'send',channel:'email',prospectId:'other-workspace'}).action,'clarify');
  const another={id:'other-jane',person:'Jane Bell',role:'Designer',company:'Elsewhere'};
  assert.equal(check('Write an email to Jane at Barbour',{action:'draft',channel:'email',prospectId:another.id},{prospects:[...prospects,another]}).action,'clarify');
});
