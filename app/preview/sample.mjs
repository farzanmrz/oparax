export function runSample(workspace, at) {
  const lead = workspace.sampleLead;
  const exists = workspace.leads.some(item => item.id === lead.id);
  const summary = exists
    ? 'Maya Ellis is already in your demo prospects. This run added 0 new people.'
    : 'Saved Maya Ellis, Footwear Materials Buyer at Wrenfield Footwear, from the sample staff profile.';
  const lastRun = {
    status: exists ? 'duplicates' : 'saved', target: 'The leather buyer at Wrenfield Footwear', summary, at
  };
  return {
    ...workspace,
    bots: workspace.bots.map(item => item.id === lead.botId ? {...item, last: at, lastRun} : item),
    leads: exists ? workspace.leads : [{...lead}, ...workspace.leads],
    messages: [...workspace.messages, {id: crypto.randomUUID(), botId: lead.botId, role: 'assistant', content: summary, at}],
    events: [{id: crypto.randomUUID(), text: summary, at}, ...workspace.events]
  };
}
