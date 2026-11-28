import test from 'node:test';
import assert from 'node:assert/strict';
import {publicJobAuthorized,showSourceGate} from '../lib/research-access.mjs';
test('public search requires an explicitly selected source on first run, retry, or schedule',()=>{
  for(const source of [undefined,'sales_navigator']){
    assert.equal(publicJobAuthorized({searchSource:source}),false);
    assert.equal(publicJobAuthorized({searchSource:source},{scheduled:true}),false);
  }
  assert.equal(publicJobAuthorized({searchSource:'web'},{scheduled:true}),true);
  assert.equal(publicJobAuthorized({searchSource:'linkedin'},{scheduled:true}),true);
  assert.equal(publicJobAuthorized({searchSource:'linkedin',skillSettings:{public_research:false}}),true);
  assert.equal(publicJobAuthorized({searchSource:'linkedin',skillSettings:{linkedin_research:false}}),false);
});
test('previously authorized legacy work may finish only its original job without granting a future run',()=>{
  const b={id:'old',researchRequestedAt:'existing',researchJob:{id:'existing',status:'continuing',pages:4}};
  assert.equal(publicJobAuthorized(b,{requestedAt:'existing',page:4}),true);
  assert.equal(publicJobAuthorized(b,{requestedAt:'future'}),false);
  const d={messages:[]};showSourceGate(d,b);
  assert.equal(publicJobAuthorized(b,{requestedAt:'existing',page:4}),true);
  delete b.researchRequestedAt;
  assert.equal(publicJobAuthorized(b,{}),false);
  assert.equal(publicJobAuthorized(b,{scheduled:true}),false);
});
