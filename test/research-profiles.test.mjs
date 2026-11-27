import test from 'node:test';
import assert from 'node:assert/strict';
import {attributedProfile,findIndexedProfiles} from '../lib/research-profiles.mjs';

const person={company:'Barbour',person:'Ian Bergin',role:'Director of Menswear, Footwear and Accessories',
  source:'https://trade.example.org/barbour-interview',evidence:'Ian Bergin, Barbour’s Director of Menswear, Footwear and Accessories',
  companyVerification:{name:'Barbour',source:'https://trade.example.org/barbour-interview',evidence:'Barbour footwear'},
  researchTarget:{company:'Barbour',industry:'footwear',industryTerms:['shoes']}};
const indexed={url:'https://uk.linkedin.com/in/example-ian',title:'Ian Bergin - Barbour | LinkedIn',snippet:''};

test('an independent named role source can disambiguate a sparse personal profile that states the exact employer',()=>{
  assert.equal(attributedProfile(person,[indexed]).linkedinUrl,'https://www.linkedin.com/in/example-ian');
  for(const substitute of [{...person,verificationSource:'profile_index'},{...person,evidence:'Barbour designs footwear.'},{...person,source:'https://other.example.org/unrelated'}])
    assert.equal(attributedProfile(substitute,[indexed]),null);
  assert.equal(attributedProfile(person,[indexed,{...indexed,url:'https://uk.linkedin.com/in/ian2'}]),null);
  assert.equal(attributedProfile(person,[{...indexed,title:'Ian Bergin - Barbour EHS | LinkedIn'}]),null);
  assert.equal(attributedProfile(person,[{...indexed,title:'Ian Bergin - Finance Director at Barbour | LinkedIn'}]),null);
});
test('named searches use multiple raw indexes without requiring a published profile to repeat the long job title',async()=>{
  const calls=[];
  const search=async(q,o)=>{calls.push([o.provider,q]);return o.provider==='sonar'?[indexed]:[];};
  const r=await findIndexedProfiles([person],'test',20000,{search});
  assert.deepEqual(calls.map(c=>c[0]),['perplexity','exa','sonar']);
  assert.ok(calls.every(c=>c[1].every(q=>!q.includes('Director')&&q.includes('Ian Bergin')&&q.includes('Barbour'))));
  assert.equal(r.failed,false);assert.ok(attributedProfile(person,r.results));
});
