import {linkedinProfileUrl} from '../lib/profile-url.mjs';
const cells=['person','role','company','linkedinUrl','sourceUrl','salesNavigatorUrl'];

function valuesToRow(values){
  if(values.length<4||values.length>6)throw Error('Each person needs four fields in order: name, role, company and personal profile URL. Two optional source URLs can follow.');
  const row=Object.fromEntries(cells.map((key,i)=>[key,(values[i]||'').trim()]));
  if(!row.salesNavigatorUrl&&/^https:\/\/(?:[a-z]+\.)?linkedin\.com\/sales\//i.test(row.linkedinUrl)){
    row.salesNavigatorUrl=row.linkedinUrl;row.linkedinUrl='';
  }
  if(!row.salesNavigatorUrl&&/^https:\/\/(?:[a-z]+\.)?linkedin\.com\/sales\//i.test(row.sourceUrl)){
    row.salesNavigatorUrl=row.sourceUrl;row.sourceUrl='';
  }
  if(!row.person&&!row.linkedinUrl&&!row.salesNavigatorUrl)throw Error('A pasted row is missing both the name and the personal profile URL.');
  return row;
}

export function parseSelectedRows(value){
  const raw=String(value||'').replace(/\r\n?/g,'\n').trim();
  if(!raw)throw Error('Paste at least one selected person.');
  if(raw.length>40000)throw Error('Paste up to 20 people at a time.');
  let groups;
  if(raw.includes('\t')){
    const lines=raw.split('\n').filter(line=>line.trim());
    if(/^(?:full )?name\t(?:current )?(?:role|title)\t/i.test(lines[0]))lines.shift();
    groups=lines.map(line=>line.split('\t'));
  }else{
    groups=[];
    for(const block of raw.split(/\n\s*\n/)){
      const lines=block.split('\n').map(line=>line.trim()).filter(Boolean);
      for(let index=0;index<lines.length;){
        const group=lines.slice(index,index+4);index+=group.length;
        while(index<lines.length&&group.length<6&&/^https?:\/\//i.test(lines[index]))group.push(lines[index++]);
        groups.push(group);
      }
    }
  }
  if(!groups.length||groups.length>20)throw Error('Paste between 1 and 20 people.');
  return groups.map(valuesToRow);
}

export function combineSelectedRows(existing,incoming,createKey){
  const rows=existing.filter(row=>cells.some(k=>row[k]?.trim())).map(row=>({...row}));
  for(const candidate of incoming){
    const match=rows.find(row=>{
      if(row.linkedinUrl&&candidate.linkedinUrl){
        return (linkedinProfileUrl(row.linkedinUrl)||row.linkedinUrl)===(linkedinProfileUrl(candidate.linkedinUrl)||candidate.linkedinUrl);
      }
      return row.person&&row.company&&row.person.toLowerCase()===candidate.person.toLowerCase()&&row.company.toLowerCase()===candidate.company.toLowerCase();
    });
    if(match){for(const cell of cells)if(!match[cell])match[cell]=candidate[cell];}
    else rows.push({...candidate,key:createKey(),included:true});
  }
  if(rows.length>20)throw Error('This selection would contain more than 20 people. Submit the current batch first.');
  return rows;
}
