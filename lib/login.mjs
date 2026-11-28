// Email templates can point here before verification or return an already-issued session.
export const expiredLinkMessage='This sign-in link has expired or has already been used. Request a new link below.';
const invalidLinkMessage='This sign-in link is incomplete or invalid. Request a new link below.';

export function loginCallback(search,fragment) {
  const query=new URLSearchParams(search), hash=new URLSearchParams(fragment.replace(/^#/,''));
  for(const params of [query,hash]){
    if(params.has('error')||params.has('error_code')){
      const code=params.get('error_code')||params.get('error');
      const description=params.get('error_description')||'';
      return {error:code==='otp_expired'||/expired|already.+used/i.test(description)?expiredLinkMessage:description||invalidLinkMessage};
    }
  }
  if(hash.has('access_token')||hash.has('refresh_token')){
    if(!hash.get('access_token')||!hash.get('refresh_token'))return {error:invalidLinkMessage};
    return {session:{access:hash.get('access_token'),refresh:hash.get('refresh_token'),expires:Date.now()+(Number(hash.get('expires_in'))||3600)*1000}};
  }
  for(const params of [query,hash]){
    if(!params.has('token_hash'))continue;
    const type=params.get('type')||'email',token=params.get('token_hash');
    if(!token||!['email','signup','magiclink'].includes(type))return {error:invalidLinkMessage};
    return {verification:{token_hash:token,type}};
  }
  return {};
}

export function verificationFailure(status,code){
  if(status===429)return {retryable:true,message:'Too many sign-in attempts. Wait a moment, then try again.'};
  if(status>=500)return {retryable:true,message:'The sign-in service is temporarily unavailable. Try this link again in a moment.'};
  return {retryable:false,message:code==='otp_expired'?expiredLinkMessage:invalidLinkMessage};
}
