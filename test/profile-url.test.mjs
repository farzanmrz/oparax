import assert from 'node:assert/strict';
import test from 'node:test';
import {linkedinProfileUrl} from '../lib/profile-url.mjs';
import {addLead} from '../lib/domain.mjs';

test('accepts a regional personal LinkedIn URL, strips tracking and rejects unrelated destinations',()=>{
  assert.equal(linkedinProfileUrl('https://uk.linkedin.com/in/someone-123/?trk=public#intro'),'https://www.linkedin.com/in/someone-123');
  for(const invalid of ['https://linkedin.com@evil.example/in/user','https://linkedin.com.evil.example/in/user','https://www.linkedin.com/company/an-org','https://www.linkedin.com/in/a%2Fb','https://www.linkedin.com/in/a/details/experience','https://www.linkedin.com/posts/item','https://lnkd.in/abc']){
    assert.equal(linkedinProfileUrl(invalid),'');
  }
});

test('research can fill a missing profile on a saved person without replacing a link or attaching one by shared email',()=>{
  const data={leads:[],suppressed:[]},agent={id:'test'};
  const p={company:'Company',person:'Alice Smith',email:'info@example.org',source:'https://example.org/team',fit:'Design',subject:'Hi',body:'Hello',linkedin:'Hi'};
  assert.equal(addLead(data,agent,p),true);
  assert.equal(addLead(data,agent,{...p,person:'Different Person',linkedinUrl:'https://www.linkedin.com/in/wrong-person'}),false);
  assert.equal(data.leads[0].linkedinUrl,'');
  const valid='https://www.linkedin.com/in/alice-smith';
  assert.equal(addLead(data,agent,{...p,linkedinUrl:valid}),false);
  assert.equal(addLead(data,agent,{...p,linkedinUrl:'https://www.linkedin.com/in/other-alice'}),false);
  assert.equal(data.leads[0].linkedinUrl,valid);
  assert.equal(data.leads.length,1);
});
