// Supabase templates may send a hash to verify, or redirect with an issued session.
export function loginCallback(search,fragment) {
  const query=new URLSearchParams(search), hash=new URLSearchParams(fragment.replace(/^#/,''));
  for(const p of [query,hash]){
    if(p.has('error'))return {error:p.get('error_description')||'This sign-in link has expired. Request another one.'};
  }
  if(hash.get('access_token')&&hash.get('refresh_token')){
    return {session:{access:hash.get('access_token'),refresh:hash.get('refresh_token'),expires:Date.now()+(Number(hash.get('expires_in'))||3600)*1000}};
  }
  if(query.has('token_hash')){
    const type=query.get('type')||'email';
    if(!query.get('token_hash')||!['email','signup','magiclink'].includes(type))return {error:'Invalid sign-in link. Request a new one.'};
    return {verification:{token_hash:query.get('token_hash'),type}};
  }
  return {};
}
