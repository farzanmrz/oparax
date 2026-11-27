import test from 'node:test';
import assert from 'node:assert/strict';
import {combineSelectedRows,parseSelectedRows} from '../app/selected-rows.mjs';

const maya=['Maya Ellis','Buyer','Fixture Co','https://uk.linkedin.com/in/Maya-Ellis?utm_source=test'];
const eli=['Eli Park','Design lead','Fixture Co','https://www.linkedin.com/in/eli-park'];

test('tabular copy accepts a header, one person and both optional evidence URLs',()=>{
  const evidence='https://example.org/team',sales='https://www.linkedin.com/sales/lead/AAA';
  let rows=parseSelectedRows('Name\tRole\tCompany\tProfile\tSource\tSales Navigator\r\n'+[...maya,evidence,sales].join('\t'));
  assert.equal(rows.length,1);assert.equal(rows[0].linkedinUrl,maya[3]);assert.equal(rows[0].sourceUrl,evidence);
  assert.equal(rows[0].salesNavigatorUrl,sales);
  rows=parseSelectedRows([...maya,sales].join('\t'));
  assert.equal(rows[0].sourceUrl,'');assert.equal(rows[0].salesNavigatorUrl,sales);
});
test('four-line blocks, with or without a blank separator, keep each person and validate limits',()=>{
  for(const divider of ['\n','\n\n']){
    const parsed=parseSelectedRows(maya.join('\n')+divider+eli.join('\n'));
    assert.deepEqual(parsed.map(p=>p.person),['Maya Ellis','Eli Park']);
  }
  assert.throws(()=>parseSelectedRows('Maya\nBuyer\nFixture'),/four fields/);
  assert.throws(()=>parseSelectedRows(Array(21).fill(maya.join('\t')).join('\n')),/20/);
});
test('merging preserves prior edits, unchecked names, original URLs, and distinct homonyms',()=>{
  const input=parseSelectedRows(maya.join('\t'))[0];
  const rows=combineSelectedRows([{...input,key:'keep',role:'Footwear buyer',included:false}],[
    {...input,linkedinUrl:'https://www.linkedin.com/in/Maya-Ellis',sourceUrl:'https://example.org/team'},
    {...input,linkedinUrl:'https://www.linkedin.com/in/another-maya'}],()=> 'new');
  assert.equal(rows.length,2);assert.equal(rows[0].included,false);assert.equal(rows[0].role,'Footwear buyer');
  assert.equal(rows[0].linkedinUrl,maya[3]);assert.equal(rows[0].sourceUrl,'https://example.org/team');
  assert.equal(rows[1].included,true);
});
