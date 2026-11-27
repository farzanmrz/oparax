// Stable preview identifier for a lead's editable initial (pre-conversation) draft.
// The server checks it against current content to catch edits between review and send.
export async function initialDraftVersion(lead,channel){
  const parts=channel==='email'?[lead.id,lead.email,lead.subject,lead.body]:[lead.id,lead.linkedinUrl,lead.linkedin];
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(parts)));
  return 'initial-'+Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}
