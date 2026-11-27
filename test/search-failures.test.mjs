import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverProfilePage} from '../lib/company-index.mjs';
import {Fault} from '../lib/store.mjs';
import {searchIssue,searchRetry,SearchInterruption} from '../lib/search-failures.mjs';

const errorWith=(statusCode,extra={})=>Object.assign(new Error('private upstream text and credentials'),{statusCode,...extra});
const group={plan:{roles:['buyers'],employers:['Example'],target:'Buyers at Example'},context:{company:'Example'},modelId:'test',timeout:40000};

test('only safe provider details reach the job; underlying gateway status survives local wrappers',()=>{
  const billing=searchIssue('parallel',new Fault('AI Gateway returned 402. Check the project model access and balance.',503));
  assert.equal(billing.kind,'billing');assert.equal(billing.status,402);
  const exhausted=searchIssue('perplexity',errorWith(429,{data:{error:{code:'insufficient_quota'}}}));
  assert.equal(exhausted.kind,'billing');
  const malformed=searchIssue('parallel',new Fault('The model returned an unreadable result.',502));
  assert.equal(malformed.kind,'response');assert.equal(malformed.status,undefined);
  const issue=searchIssue('exa',errorWith(403));
  const message=new SearchInterruption([issue,issue,billing]).message;
  assert.match(message,/Exa access denied \(HTTP 403\)/);
  assert.match(message,/billing or quota/);assert.doesNotMatch(message,/private|credentials/);
});

test('retry uses the existing page time budget and respects long provider cooldowns',()=>{
  const busy=searchIssue('perplexity',errorWith(429,{responseHeaders:{'retry-after':'30'}}));
  assert.equal(searchRetry([busy],60000),null);
  const outage=searchIssue('perplexity',errorWith(503));
  assert.equal(searchRetry([outage],5999),null);
  assert.equal(searchRetry([outage,searchIssue('exa',errorWith(402))],60000),null);
  assert.equal(searchRetry([searchIssue('exa',new Error('unrecognized upstream reply'))],60000),null);
  assert.deepEqual(searchRetry([outage],10000),{provider:'perplexity',delay:1000});
});

test('one transient retry can recover with a valid empty response, without another page or job',async()=>{
  let attempts=0,retries=0,waiting=0;
  const value=await discoverProfilePage({...group,wait:async ms=>{waiting=ms;},
    onSearch:async e=>{if(e.phase==='retry')retries++;},
    search:async()=>{attempts++;if(retries)return [];throw errorWith(503);}});
  assert.equal(retries,1);assert.equal(waiting,1000);
  assert.equal(value.searches,attempts);assert.equal(value.searched,true);assert.deepEqual(value.rows,[]);
});

test('repeat outage stops with diagnostics and makes exactly one retry; permanent failures and empty searches never retry',async()=>{
  for(const [mode,expected] of [['transient',1],['access',0],['empty',0],['unknown',0]]){
    let retries=0;
    const run=()=>discoverProfilePage({...group,wait:async()=>{},onSearch:async e=>{if(e.phase==='retry')retries++;},
      search:async()=>{if(mode==='empty')return [];throw mode==='unknown'?new Error('secret data'):errorWith(mode==='access'?403:503);}});
    if(mode==='empty'){assert.equal((await run()).searched,true);}
    else {await assert.rejects(run,e=>e instanceof SearchInterruption&&!e.message.includes('secret data'));}
    assert.equal(retries,expected,mode);
  }
});
