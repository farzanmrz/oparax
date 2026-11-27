'use client';

import './tools-panel.css';

const paths = {
  search: 'M20.3 20.3 16 16 M17.4 10.6a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0',
  computer: 'M3 5h18v12H3z M8 21h8 M12 17v4',
  linkedin: 'M4 4h16v16H4z M8 10v6 M8 7.5v.1 M11.5 16v-6 M11.5 12.5c0-3.3 5-3.3 5 0V16',
  outbound: 'm3 11 17-7-5.5 16-3.7-6.8z M11 13.2 20 4',
  inbox: 'M3 15l3-10h12l3 10v4H3z M3 15h5l1.5 2h5l1.5-2h5'
};

function ToolRow({name,icon,status,connected,children,actions}) {
  return <li className="agt-row">
    <span className="agt-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[icon]}/></svg>
    </span>
    <div className="agt-copy">
      <div className="agt-label"><strong>{name}</strong><span className={'agt-status'+(connected?' agt-connected':'')}>{status}</span></div>
      <p>{children}</p>
    </div>
    <div className="agt-actions">{actions}</div>
  </li>;
}

export default function AgentTools({agent,workspace,demo=false,busy=false,onOpen,onNavigate,onShowProspects,onShowActivity,onOpenComputer,onChooseSource}) {
  const sender=workspace.mailbox?.email;
  const inbox=agent.inbox?.email;
  const provisioned=!!workspace.agentMailConnected;
  const sending=!!(sender&&agent.active&&agent.autoEmail&&!demo);
  const verifying=!demo&&agent.lastRun?.status==='verifying'&&Date.parse(agent.lease?.until)>Date.now();

  const privateSource=['linkedin','sales_navigator'].includes(agent.searchSource);
  function chooseComputer() {
    if(!demo&&privateSource&&onOpenComputer){onOpenComputer(agent.searchSource);return;}
    if(onChooseSource){onChooseSource();return;}
    onNavigate('LinkedIn queue');
  }
  function showActivity() {
    if(onShowActivity){onShowActivity();return;}
    const feed=document.getElementById('research-activity');
    if(feed)feed.scrollIntoView({block:'start'});
    else onNavigate('Activity');
  }
  function openInbox() {
    onOpen(demo||provisioned?'inbox':'agentmail');
  }

  return <section className="agt-tools" aria-label="Agent tools and connections">
    <h2>Tools &amp; connections</h2>
    <ul>
      <ToolRow name={privateSource?'Public evidence':'Web research'} icon="search" status={privateSource?'Verification':demo?'Sample search':agent.active?`Every ${agent.cadence}h`:'On demand'}
        actions={<button type="button" onClick={showActivity}>View activity</button>}>
        {privateSource?'Checks the people you select against public employer and role evidence.':demo?'Replay the sample search and see the evidence it uses.':'Searches the public web for people, employers and professional profiles.'}
      </ToolRow>
      <ToolRow name="Verification computer" icon="computer" status={demo?'Sample evidence':verifying?'Checking sources':'On demand'} connected={verifying}
        actions={<button type="button" onClick={onShowProspects}>View sources</button>}>
        {demo?'See the source behind the sample prospect.':'An isolated computer opens source pages to check each person’s role and employer.'}
      </ToolRow>
      <ToolRow name="LinkedIn & Sales Navigator" icon="linkedin" status={demo?'Demo':privateSource?'Private browser':'Select a source'}
        actions={<><button type="button" onClick={chooseComputer}>{demo||!privateSource?'Choose source':'Open agent computer'}</button><button type="button" onClick={()=>onNavigate('LinkedIn queue')}>Review drafts</button></>}>
        {demo?'Explore how agents review people you select in a private browser.':'Sign in inside the private computer, select people and submit their profiles for verification. You control sign-in and message delivery.'}
      </ToolRow>
      <ToolRow name="Outbound mailbox" icon="outbound" status={demo?'Demo':!sender?'Not connected':sending?'Sending enabled':'Sending off'} connected={sending}
        actions={demo?<a href="/">Sign in to connect</a>:<button type="button" disabled={busy} onClick={()=>sender?onNavigate('Mailbox'):onOpen('connect')}>{sender?'Manage mailbox':'Connect mailbox'}</button>}>
        {demo?'Connect your own sender in your workspace.':sender?`${sender} · ${sending?`Up to ${agent.cap} campaign emails per day.`:'Automatic campaign email is off.'}`:'Use your email address for campaign outreach and reply tracking.'}
      </ToolRow>
      <ToolRow name="AgentMail inbox" icon="inbox" status={demo?'Demo':inbox?'Assigned':provisioned?'Ready to create':'Not connected'} connected={!demo&&!!inbox}
        actions={<button type="button" disabled={busy} onClick={openInbox}>{demo?'View inbox':inbox?'Open inbox':provisioned?'Set up inbox':'Connect AgentMail'}</button>}>
        {demo?'Each agent can have an address for incoming messages.':inbox?`${inbox} · Read incoming messages and reply from this address.`:'Give this agent its own address for incoming messages and replies.'}
      </ToolRow>
    </ul>
  </section>;
}
