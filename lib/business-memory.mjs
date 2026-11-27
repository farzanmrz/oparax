export const BUSINESS_MEMORY_LIMITS=Object.freeze({
  company:180,productsServices:3000,salesProposition:2500,proof:3500,buyerTargeting:2500,voice:1500,restrictions:2500,
});

const labels={
  company:'Company',productsServices:'Products and services',salesProposition:'Sales proposition',
  proof:'Proof',buyerTargeting:'Buyer targeting',voice:'Voice',restrictions:'Restrictions',
};
const keys=Object.keys(BUSINESS_MEMORY_LIMITS);
const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const control=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const credential=/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----|\b(?:sb_secret_|sk_live_|ghp_|github_pat_)[A-Za-z0-9_=-]{16,}|\bBearer\s+[A-Za-z0-9._~-]{30,}/i;
const tidy=value=>value.replace(/\r\n?/g,'\n').trim();

function invalid(message){
  const error=new Error(message);
  error.status=400;
  return error;
}

/** Only owner-authored, validated business fields are exposed to the desk or its models. */
export function projectBusinessMemory(stored) {
  const source=plain(stored)?stored:{};
  const version=Number.isSafeInteger(source.version)&&source.version>=0?source.version:0;
  const updatedAt=version&&typeof source.updatedAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(source.updatedAt)?source.updatedAt:null;
  const result={version,updatedAt};
  for(const key of keys){
    const value=Object.hasOwn(source,key)&&typeof source[key]==='string'?tidy(source[key]):'';
    result[key]=value.length<=BUSINESS_MEMORY_LIMITS[key]&&!control.test(value)&&!credential.test(value)?value:'';
  }
  return result;
}

export function businessMemoryContext(workspace) {
  const memory=projectBusinessMemory(workspace?.businessMemory);
  return Object.fromEntries(keys.filter(key=>memory[key]).map(key=>[key,memory[key]]));
}

/** Called inside the workspace's revision-checked edit, including on every CAS retry. */
export function changeBusinessMemory(workspace,input) {
  if(!plain(input)||Object.keys(input).some(key=>!['expectedVersion','fields'].includes(key))
      ||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||!plain(input.fields)){
    throw invalid('Provide the version and business fields you want to save.');
  }
  const entries=Object.entries(input.fields);
  if(!entries.length)throw invalid('Choose at least one business field to update.');
  const patch={};
  for(const [key,value] of entries){
    if(!Object.hasOwn(BUSINESS_MEMORY_LIMITS,key))throw invalid('Unknown business memory field.');
    if(typeof value!=='string')throw invalid(labels[key]+' must be text.');
    const text=tidy(value);
    if(text.length>BUSINESS_MEMORY_LIMITS[key])throw invalid(labels[key]+' exceeds '+BUSINESS_MEMORY_LIMITS[key]+' characters.');
    if(control.test(text))throw invalid(labels[key]+' contains an unsupported control character.');
    if(credential.test(text))throw invalid('Remove the credential from '+labels[key]+' before saving.');
    patch[key]=text;
  }
  const current=projectBusinessMemory(workspace.businessMemory);
  if(current.version!==input.expectedVersion){
    const error=new Error('Business memory changed in another session. Review the latest version before saving.');
    error.status=409;
    error.memory=current;
    throw error;
  }
  if(Object.keys(patch).every(key=>current[key]===patch[key]))return current;
  const memory={...current,...patch,version:current.version+1,updatedAt:new Date().toISOString()};
  workspace.businessMemory=memory;
  return memory;
}
