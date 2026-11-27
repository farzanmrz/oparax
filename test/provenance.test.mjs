import test from 'node:test';
import assert from 'node:assert/strict';
import {prospectSources,recordProspectSource} from '../lib/provenance.mjs';
test('one qualified person can have three independent, tenant-scoped discovery sources',()=>{
  const lead={};
  for(const source of ['web','rocketreach','email','web'])recordProspectSource(lead,{agentId:'one',source,at:'today',url:'https://example.com/source'});
  recordProspectSource(lead,{agentId:'two',source:'linkedin',url:'https://www.linkedin.com/in/example'});
  assert.deepEqual(prospectSources(lead,'one').map(x=>x.source),['web','rocketreach','email']);
  assert.equal(prospectSources(lead,'one')[2].url,undefined);
  assert.deepEqual(prospectSources(lead,'two').map(x=>x.source),['linkedin']);
});

test('rechecking a person preserves first discovery and records the latest verification',()=>{
  const lead={};
  for(const at of ['2026-11-24','2026-11-27','2026-11-26']){
    recordProspectSource(lead,{agentId:'bot',source:'rocketreach',at});
  }
  assert.equal(lead.discoverySources.length,1);
  assert.equal(lead.discoverySources[0].at,'2026-11-24');
  assert.equal(lead.discoverySources[0].lastVerifiedAt,'2026-11-27');
});
