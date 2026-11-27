import Workspace from '../workspace';

export const metadata = { title: 'Interactive demo · Oparax', robots: { index: false } };

export default function PreviewPage() {
  return <Workspace preview={{
    bots: [{
      id: 'demo-footwear', name: 'Footwear sourcing',
      brief: 'Find the person who buys leather for Wrenfield Footwear’s UK design team.',
      cadence: 24, cap: 5, delay: 5, active: false, autoEmail: false, last: null
    }],
    leads: [], messages: [], events: [], mailbox: null, agentMailConnected: false,
    sampleLead: {
      id: 'demo-buyer', botId: 'demo-footwear', company: 'Wrenfield Footwear',
      person: 'Maya Ellis', role: 'Footwear Materials Buyer', email: '', status: 'research', stage: 0,
      fit: 'Maya selects the leathers used by Wrenfield’s UK design team.',
      evidence: 'Maya Ellis, our Footwear Materials Buyer, selects leather for the UK design studio.',
      subject: 'Leather samples for the UK design studio',
      body: 'Hi Maya, would it be useful to review a small set of leather swatches for an upcoming footwear collection? I can send specifications for the finishes your studio is exploring.',
      linkedin: 'Hi Maya, I saw you select leather for Wrenfield’s UK design studio. Which material finishes are you exploring for the next collection?',
      linkedinState: 'draft'
    }
  }}/>;
}
