import test from 'node:test';
import assert from 'node:assert/strict';
import {view} from '../lib/store.mjs';
test('workspace view never serializes provider credentials, raw mail references, or OAuth state',()=>{
 const marker='test-private-credential';
 const b={id:'b',brief:'Find buyers at Example',mailboxEvidence:{privateRef:marker},mailboxScanHistory:[marker],mailboxScanLease:{private:marker},mailboxResearchConsent:{mailboxId:marker},selectedSourceLeases:{linkedin:{id:marker}}};
 const workspace={bots:[b],leads:[],messages:[],events:[],mailbox:{email:'sender@example.com',secret:marker},agentMailKey:marker,computerLaunch:{token:marker},conversationReceipts:{s:marker},rocketReach:{key:marker,accountId:marker},linkedinMessagingAccount:{token:marker},linkedinMessagingOAuth:{state:marker}};
 const out=view(workspace);
 assert.equal(JSON.stringify(out).includes(marker),false);
 assert.equal(out.mailbox.email,'sender@example.com');assert.equal(out.agentMailConnected,true);
});

test('a research receipt exposes aggregate evidence and preserves an open-ended request',()=>{
 const receipt={reason:'diminishing_returns',uniqueCandidates:82,uniqueQualified:17,ceiling:null,productiveBatches:4,successfulBatches:7,
   sourceFamilies:['Professional profile index',{raw:'private-profile'}],distinctQueries:25,heldForEvidence:9,scope:'UK buyers',summary:'17 verified contacts.',pending:['private-profile']};
 const [agent]=view({bots:[{brief:'Find buyers',researchJob:{plan:{limitVersion:2},goal:null},lastRun:{status:'exhausted',receipt}}]}).bots;
 assert.deepEqual(agent.lastRun.receipt,{...Object.fromEntries(Object.entries(receipt).filter(([k])=>k!=='pending')),sourceFamilies:['Professional profile index']});
 assert.equal(agent.researchJob.goal,null);
 assert.doesNotMatch(JSON.stringify(agent),/private-profile/);
});

test('a legacy quota is displayed only if the customer explicitly requested a ceiling',()=>{
 const bot={brief:'Find buyers at Example',sourceTask:{goal:50},researchGoal:50,researchJob:{goal:50,qualified:50,status:'goal_met'},lastRun:{status:'goal_met',summary:'Reached your requested maximum of 50.'}};
 const implicit=view({bots:[bot]}).bots[0];
 assert.equal(implicit.taskGoal,undefined);
 assert.equal(implicit.researchJob.goal,null);
 assert.equal(implicit.researchJob.status,'completed');
 assert.doesNotMatch(implicit.lastRun.summary,/requested maximum/);
 const explicit=view({bots:[{...bot,clarifications:[{answer:'Find up to 10 buyers.'}]}]}).bots[0];
 assert.equal(explicit.taskGoal,10);
 assert.equal(explicit.researchJob.goal,10);
 const paraphrase='Find up to 50 buyers.';
 const literal=view({bots:[{...bot,brief:paraphrase,researchLimitInput:{brief:paraphrase,instructions:['Find all the buyers.']}}]}).bots[0];
 assert.equal(literal.researchJob.goal,null);
});

test('research held for evidence is separate from results over a requested limit',()=>{
 const b={brief:'Find five buyers',lastSelectedImport:{held:[],skippedAtLimit:3},lastMailboxResearch:{held:2,skippedAtLimit:1}};
 const agent=view({bots:[b]}).bots[0];
 assert.deepEqual(agent.lastSelectedImport.held,[]);
 assert.equal(agent.lastSelectedImport.skippedAtLimit,3);
 assert.deepEqual(agent.lastMailboxResearch,{held:2,skippedAtLimit:1});
 b.lastMailboxResearch.skippedAtLimit={private:'unexpected'};
 assert.equal(view({bots:[b]}).bots[0].lastMailboxResearch.skippedAtLimit,undefined);
});
