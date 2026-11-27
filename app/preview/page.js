import Workspace from '../workspace';

export const metadata={title:'Interactive demo · Oparax',robots:{index:false}};

export default function PreviewPage(){
  const agents=[
    {id:'demo-footwear',name:'Footwear sourcing',brief:'Find the person who buys leather for Wrenfield Footwear’s UK design team.'},
    {id:'demo-retail',name:'Retail partnerships',brief:'Find the partnerships buyer at Northline House who selects independent footwear brands.'}
  ].map(agent=>({...agent,searchSource:'web',cadence:24,cap:5,delay:5,active:false,autoEmail:false,last:null}));
  const leads=[
    {id:'demo-buyer',botId:agents[0].id,company:'Wrenfield Footwear',person:'Maya Ellis',role:'Footwear Materials Buyer',
      fit:'Maya selects the leathers used by Wrenfield’s UK design team.',
      evidence:'Maya Ellis, our Footwear Materials Buyer, selects leather for the UK design studio.',
      subject:'Leather samples for the UK design studio',
      body:'Hi Maya, would it be useful to review a small set of leather swatches for an upcoming footwear collection? I can send specifications for the finishes your studio is exploring.',
      linkedin:'Hi Maya, I saw you select leather for Wrenfield’s UK design studio. Which material finishes are you exploring for the next collection?'},
    {id:'demo-partner',botId:agents[1].id,company:'Northline House',person:'Eli Park',role:'Brand Partnerships Buyer',
      fit:'Eli selects independent footwear brands for Northline House stores.',
      evidence:'Eli Park leads footwear brand partnerships across our stores.',
      subject:'An independent footwear line for Northline House',
      body:'Hi Eli, which footwear categories are you looking to add to Northline House this season? I would be glad to share a short line sheet if there is a fit.',
      linkedin:'Hi Eli, I saw you lead footwear partnerships at Northline House. Are you reviewing independent collections this season?'}
  ].map(lead=>({...lead,email:'',status:'research',stage:0,linkedinState:'draft'}));
  return <Workspace preview={{bots:agents,leads:[],messages:[
    {id:'demo-user-1',botId:agents[0].id,role:'user',content:agents[0].brief},
    {id:'demo-agent-1',botId:agents[0].id,role:'assistant',content:'I can check Wrenfield’s sample staff profile for the buyer and draft an introduction. Run sample research to get started.'},
    {id:'demo-user-2',botId:agents[1].id,role:'user',content:agents[1].brief},
    {id:'demo-agent-2',botId:agents[1].id,role:'assistant',content:'I can check Northline’s sample profile for the partnerships buyer. Run sample research when you’re ready.'}
  ],events:[],mailbox:null,agentMailConnected:false,sampleLead:leads[0],sampleLeads:leads}}/>;
}
