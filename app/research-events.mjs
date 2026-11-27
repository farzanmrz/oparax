export async function readResearchStream(body,onSnapshot) {
  const reader=body.getReader();
  const decoder=new TextDecoder();
  let buffer='',finished=false;
  function process(chunk){
    buffer+=chunk;
    let boundary;
    while((boundary=/\r?\n\r?\n/.exec(buffer))!==null){
      const block=buffer.slice(0,boundary.index);
      buffer=buffer.slice(boundary.index+boundary[0].length);
      let type='';
      const data=[];
      for(const line of block.split(/\r?\n/)){
        if(line.startsWith('event:'))type=line.slice(6).trim();
        if(line.startsWith('data:'))data.push(line.slice(5).replace(/^ /,''));
      }
      if(type!=='snapshot'||!data.length)continue;
      const record=JSON.parse(data.join('\n'));
      if(!record||!Array.isArray(record.events))throw Error('Invalid research activity update.');
      onSnapshot(record);
      if(record.finished){finished=true;return;}
    }
    if(buffer.length>2_000_000)throw Error('Research activity update exceeded its size limit.');
  }
  try{
    while(!finished){
      const {done,value}=await reader.read();
      if(done){process(decoder.decode());break;}
      process(decoder.decode(value,{stream:true}));
    }
    return finished;
  }finally{
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}
