import {linkedinProfileUrl} from './profile-url.mjs';

const normalized = value => typeof value === 'string'
  ? value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'') : '';

export function isPublishedProspect(lead) {
  if (!lead?.person?.trim() || !lead.role?.trim() || !linkedinProfileUrl(lead.linkedinUrl)) return false;
  const proof = lead.companyVerification;
  const company = normalized(lead.company);
  const profileEvidence = typeof lead.linkedinEvidence === 'string'
    ? lead.linkedinEvidence : lead.linkedinEvidence?.quote || lead.linkedinEvidence?.evidence;
  if (!company || normalized(proof?.name) !== company || !proof?.evidence?.trim() || !profileEvidence?.trim()) return false;
  try {
    const source = new URL(proof.source);
    return source.protocol === 'https:' && !source.username && !source.password;
  } catch { return false; }
}
