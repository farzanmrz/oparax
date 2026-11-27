import test from 'node:test';
import assert from 'node:assert/strict';
import {appendActivity,activitySnapshot} from '../lib/research-activity.mjs';

test('activity exposes actions for one run and filters private job data and unsafe links',()=>{
  const b={researchJob:{id:'one',goal:50,pages:2,qualified:2,counts:{candidates:18},pending:['held-person'],status:'running'}};
  appendActivity(b,'query','Search public profiles for footwear buyers');
  appendActivity(b,'query','Search public profiles for footwear buyers');
  appendActivity(b,'source','Checking the company website','javascript:alert(1)');
  appendActivity(b,'saved','Published a verified person','https://example.org/evidence');
  const data=activitySnapshot(b);
  assert.equal(data.events.length,3);
  assert.equal(data.finished,false);
  assert.equal(data.examined,18);
  assert.equal(data.qualified,2);
  assert.equal(data.events[1].source,undefined);
  assert.equal(data.events[2].source,'https://example.org/evidence');
  assert.ok(!JSON.stringify(data).includes('held-person'));
  b.researchJob={id:'two',status:'needs_input'};
  assert.deepEqual(activitySnapshot(b).events,[]);
  appendActivity(b,'target','Which company should I search?');
  assert.equal(activitySnapshot(b).events.length,1);
  assert.equal(activitySnapshot(b).finished,true);
});
