import test from 'node:test';
import assert from 'node:assert/strict';
import {sonarSources} from '../lib/sonar-sources.mjs';
import {searchIssue} from '../lib/search-failures.mjs';
import {attributedProfile} from '../lib/research-profiles.mjs';

const url='https://www.linkedin.com/in/prospect-example';
const generated='Fictional Person - Buyer at Example';
test('SDK citations survive absent optional fields; generated text cannot qualify a person',()=>{
  const emptyEvidence=sonarSources({steps:[{sources:[{sourceType:'url',url}],text:generated}]});
  assert.deepEqual(emptyEvidence.hits,[{url,title:'',snippet:''}]);
  assert.equal(attributedProfile({person:'Fictional Person',role:'Buyer',company:'Example'},emptyEvidence.hits),null);
  const named=sonarSources({steps:[{sources:[{sourceType:'url',url,title:generated}]}]});
  assert.equal(named.hits[0].title,generated);
});
test('native structured results enrich the exact provider citation and deduplicate it',()=>{
  const result=sonarSources({steps:[{sources:[{sourceType:'url',url}],
    response:{body:{search_results:[{title:'Attributed search title',url,snippet:'A grounded excerpt.'}],citations:[url]}},
    providerMetadata:{perplexity:{searchQueries:['query one'],searchResults:[{url:'file:///invalid',title:'Invalid'}]}}}]});
  assert.deepEqual(result,{hits:[{url,title:'Attributed search title',snippet:'A grounded excerpt.'}],queries:['query one']});
});
test('an empty successful source list differs from an actual provider or transport error',()=>{
  assert.deepEqual(sonarSources({steps:[{sources:[],finishReason:'stop'}]}).hits,[]);
  assert.throws(()=>sonarSources({steps:[]}),/no provider response/);
  assert.throws(()=>sonarSources({steps:[{finishReason:'error',response:{body:{error:{status:429,message:'private details'}}}}]}),e=>{
    assert.equal(searchIssue('sonar',e).kind,'rate');
    assert.doesNotMatch(e.message,/private details/);
    return true;
  });
});
