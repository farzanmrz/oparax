import {edit,failure,verifiedUser,withWorkspace} from '../../../../lib/store.mjs';
import {browserCookie,startLinkedInConnection} from '../../../../lib/linkedin-messaging.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const privateHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
export async function POST(req){
  try {
    const user=await verifiedUser(req);
    const {url,cookie}=await withWorkspace(user.id,()=>startLinkedInConnection(req));
    return Response.json({url},{headers:{...privateHeaders,'Set-Cookie':browserCookie+'='+cookie+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600'}});
  }catch(error){return failure(error);}
}
export async function DELETE(req){
  try {
    const user=await verifiedUser(req);
    await withWorkspace(user.id,()=>edit(d=>{delete d.linkedinMessagingAccount;delete d.linkedinMessagingOAuth;}));
    return Response.json({connected:false},{headers:{...privateHeaders,'Set-Cookie':browserCookie+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});
  }catch(error){return failure(error);}
}
