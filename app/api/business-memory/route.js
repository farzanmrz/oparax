import {changeBusinessMemory,projectBusinessMemory} from '../../../lib/business-memory.mjs';
import {edit,Fault,failure,read,verifiedUser,withWorkspace} from '../../../lib/store.mjs';

export const runtime='nodejs',dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const maxBytes=96*1024;

async function inputFrom(request) {
  if(Number(request.headers.get('content-length'))>maxBytes)throw new Fault('Business memory request is too large.',413);
  const reader=request.body?.getReader();
  if(!reader)throw new Fault('Provide the business fields to save.');
  const chunks=[];
  let length=0;
  try {
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>maxBytes){await reader.cancel();throw new Fault('Business memory request is too large.',413);}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  try {return JSON.parse(Buffer.concat(chunks,length).toString('utf8'));}
  catch {throw new Fault('Provide a valid business memory request.');}
}

async function saveCurrent(input) {
  try {return await edit(d=>changeBusinessMemory(d,input));}
  catch(error){
    if(error.status===409&&!error.memory){
      const {data}=await read();
      error.memory=projectBusinessMemory(data.businessMemory);
    }
    throw error;
  }
}

function respondError(error) {
  if(error.status===409&&error.memory)return Response.json({error:error.message,memory:error.memory},{status:409,headers});
  const response=failure(error);
  response.headers.set('Cache-Control',headers['Cache-Control']);
  return response;
}

export async function GET(request) {
  try {
    const user=await verifiedUser(request);
    const {data}=await withWorkspace(user.id,read);
    return Response.json({memory:projectBusinessMemory(data.businessMemory)},{headers});
  } catch(error){return respondError(error);}
}

export async function PUT(request) {
  try {
    const user=await verifiedUser(request);
    const input=await inputFrom(request);
    const memory=await withWorkspace(user.id,()=>saveCurrent(input));
    return Response.json({memory},{headers});
  } catch(error){return respondError(error);}
}
