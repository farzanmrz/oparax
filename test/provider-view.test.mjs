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
