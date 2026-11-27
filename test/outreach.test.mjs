import test from 'node:test';import assert from 'node:assert/strict';
import {createBot,addLead,claimMail,stop,canSend} from '../lib/domain.mjs';
import {view,seal,unseal} from '../lib/store.mjs';
test('two campaigns share one ledger and paused campaigns cannot send',()=>{const d={bots:[],leads:[],messages:[],events:[],suppressed:[],mailbox:{email:'x@example.test',address:'HQ',secret:'x'}};
const a=createBot(d,{name:'A',brief:'Shoes'}),b=createBot(d,{name:'B',brief:'Boots'});const p={company:'Demo',person:'Pat',source:'https://example.test/contact',email:'pat@example.test',fit:'Shoes',subject:'Hello',body:'Hello Pat',linkedin:'Hi Pat'};
assert.equal(addLead(d,d.bots[0],p),true);assert.equal(addLead(d,d.bots[1],p),false);const bot=d.bots[0],l=d.leads[0];assert.equal(canSend(d,bot,l),false);Object.assign(bot,{active:true,autoEmail:true,cap:1});assert.ok(claimMail(d,bot,l));assert.equal(claimMail(d,bot,l),false);l.status='sent';assert.equal(claimMail(d,bot,l),false);stop(d,l,'replied');assert.equal(canSend(d,bot,l),false);assert.equal(view(d).mailbox.secret,undefined);assert.notEqual(a,b)});
test('mailbox secrets round trip with authenticated encryption',()=>{process.env.SUPABASE_SECRET_KEY='test-only';const c=seal('test-app-password');assert.ok(!c.includes('password'));assert.equal(unseal(c),'test-app-password');assert.throws(()=>unseal(c+'AA'))});
