import Workspace from '../workspace';

export const metadata = { title: 'Workspace preview · Oparax', robots: { index: false } };

const agent = {
  id: 'footwear',
  name: 'UK footwear sourcing',
  brief: 'Find independent UK footwear brands that source finished leather and identify the right person to contact.',
  cadence: 24, cap: 5, delay: 5, active: false, last: null
};
const prospect = {
  id: 'sample-prospect', botId: agent.id, company: 'Sample Footwear Co.',
  person: 'Sourcing team', email: 'sourcing@example.com', status: 'queued', stage: 0,
  fit: 'This fictional buyer illustrates a brand sourcing leather for its next footwear collection.',
  subject: 'Leather samples for your next collection',
  body: 'Hello, would a sample set and a short material specification be useful for your next collection?',
  linkedin: 'I saw your focus on leather footwear. Who handles material sourcing for your next collection?',
  linkedinState: 'draft'
};
const sample = {
  bots: [agent], leads: [prospect], mailbox: null, agentMailConnected: false,
  messages: [{ id: 'sample-message', botId: agent.id, role: 'assistant', content: 'The sample buyer and its outreach drafts are ready in Prospects and LinkedIn queue.' }],
  events: [{ id: 'sample-event', at: '2026-11-27T08:00:00Z', text: 'Prepared a sample buyer and two outreach drafts.' }]
};
export default function PreviewPage() {
  return <Workspace preview={sample}/>;
}
