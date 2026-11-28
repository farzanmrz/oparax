'use client';

import './tools-panel.css';
import {selectedSearchSources,sourceLabel} from '../lib/search-source.mjs';

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

export default function AgentTools({agent,workspace,demo=false,busy=false,onOpen,onNavigate,onShowProspects,onShowActivity,onOpenComputer,onChooseSource,onManageSource}) {
  const sender=workspace.mailbox?.email;
  const inbox=agent.inbox?.email;
  const provisioned=!!workspace.agentMailConnected;
  const sending=!!(sender&&agent.active&&agent.autoEmail&&!demo);

  const sources=selectedSearchSources(agent);
  const privateSources=sources.filter(s=>s==='linkedin'||s==='sales_navigator');
  const publicSearch=sources.includes('web');
  const rocketConnected=!!workspace.rocketReach?.connected;
  function openSource(source) {
    if(!demo&&source&&onOpenComputer){onOpenComputer(source);return;}
    if(onChooseSource){onChooseSource();return;}
    onNavigate('LinkedIn queue');
  }
  function manageSource(source){
    if(onManageSource){onManageSource(source);return;}
    if(onChooseSource)onChooseSource();
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
      <ToolRow name={publicSearch||!sources.length?'Web research':'Public evidence'} icon="search" status={!publicSearch&&sources.length?'Verification':demo?'Sample search':agent.active?`Every ${agent.cadence}h`:'On demand'}
        actions={<><button type="button" onClick={showActivity}>View activity</button><button type="button" onClick={onShowProspects}>View sources</button></>}>
        {!publicSearch&&sources.length?'Checks profiles against public employer and role evidence.':demo?'Replay the sample search and see the evidence it uses.':'Searches the public web for people, employers and professional profiles.'}
      </ToolRow>
      <ToolRow name="Workspace computer" icon="computer" status={demo?'Demo':'On demand'}
        actions={demo?<a href="/">Sign in to open a computer</a>:<button type="button" onClick={()=>onOpenComputer('desktop')}>Open computer</button>}>
        Your bots share one private browser in this workspace.
      </ToolRow>
      <ToolRow name="LinkedIn & Sales Navigator" icon="linkedin" status={demo?'Demo':privateSources.includes('linkedin')?'Public profile search':privateSources.length?'Private browser':'Select a source'}
        actions={<>{!demo&&privateSources.length?privateSources.map(s=><button type="button" key={s} onClick={()=>openSource(s)}>Open {sourceLabel(s)}</button>):<button type="button" onClick={()=>openSource()}>Choose source</button>}<button type="button" onClick={()=>onNavigate('LinkedIn queue')}>Review drafts</button></>}>
        Agents can find publicly indexed LinkedIn profiles. Open the workspace browser to view a private profile or use Sales Navigator.
      </ToolRow>
      <ToolRow name="RocketReach" icon="search" status={demo?'Demo':rocketConnected?'Connected':'Not connected'} connected={!demo&&rocketConnected}
        actions={<button type="button" disabled={busy} onClick={()=>manageSource('rocketreach')}>{rocketConnected?'Manage RocketReach':'Connect RocketReach'}</button>}>
        Connect your RocketReach account once for all your bots. Each bot can search by role and employer when RocketReach is enabled.
      </ToolRow>
      {sources.includes('email')&&<ToolRow name="Mailbox research" icon="inbox" status={demo?'Demo':sender?'Connected':'Not connected'} connected={!demo&&!!sender}
        actions={<button type="button" disabled={busy} onClick={()=>manageSource('email')}>Manage email source</button>}>
        Checks contacts from your connected mailbox against the research brief.
      </ToolRow>}
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
