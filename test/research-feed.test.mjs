import assert from 'node:assert/strict';
import test from 'node:test';
import {readResearchStream} from '../app/research-events.mjs';

test('reads live snapshots across UTF-8 and CRLF boundaries and stops on a terminal snapshot',async()=>{
  const packet=(finished,text)=>'event: snapshot\r\ndata: '+JSON.stringify({finished,events:[{id:'a',text}]})+'\r\n\r\n';
  const bytes=new TextEncoder().encode(': keep-alive\r\n\r\n'+packet(false,'Café, UK')+packet(true,'Goal reached'));
  let i=0;
  const stream=new ReadableStream({pull(controller){if(i<bytes.length)controller.enqueue(bytes.slice(i,++i));else controller.close()}});
  const seen=[];
  assert.equal(await readResearchStream(stream,result=>seen.push(result.events[0].text)),true);
  assert.deepEqual(seen,['Café, UK','Goal reached']);
});
test('allows reconnect after a nonterminal server rotation without inventing a last event',async()=>{
  const stream=new Response('retry: 1000\n\n: keep-alive\n\nevent: snapshot\ndata: {"finished":false,"events":[]}\n\n').body;
  const seen=[];
  assert.equal(await readResearchStream(stream,entry=>seen.push(entry)),false);
  assert.equal(seen.length,1);
});
