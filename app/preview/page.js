import Workspace from '../workspace';

export const metadata={title:'Interactive demo · Oparax',robots:{index:false}};

const sampleSkills=[
  ['public_research','Public web research','Research public evidence.'],['linkedin_research','LinkedIn research','Find and check people from public LinkedIn profiles.'],
  ['sales_navigator_research','Sales Navigator research','Check private leads you add from Sales Navigator.'],['rocketreach_research','RocketReach research','Find professional contacts in RocketReach.'],
  ['mailbox_research','Mailbox research','Check correspondence within an approved scope.'],['draft_outreach','Outreach drafting','Prepare personalized introductions.'],
  ['email_delivery','Email delivery','Send approved outreach through a connected mailbox.'],['linkedin_delivery','LinkedIn messaging','Use an approved messaging account.'],
  ['computer_use','Private computer','Open the browser shared by your workspace bots.']
].map(([id,label,description])=>({id,label,description,enabled:['public_research','draft_outreach'].includes(id),connectorState:'demo'}));
const salesConnectors=[['ai','AI Gateway'],['web','Public search'],['computer','Workspace computer'],['rocketreach','RocketReach'],['mailbox','Connected mailbox'],['agentmail','AgentMail'],['linkedin_messaging','LinkedIn Messaging']].map(([id,label])=>({id,label,status:'demo',summary:'Preview only'}));
const businessMemory={version:1,company:'Alder Studio (fictional)',productsServices:'Leather swatches for independent footwear designers.',salesProposition:'Let buyers evaluate new finishes before choosing a material.',proof:'Use only the fictional sample profile shown in this demo.',buyerTargeting:'UK materials and partnerships buyers',voice:'Short, direct and specific.',restrictions:'Ask before sending sample specifications.'};
const customSkills=[{id:'sample-introduction',name:'Introduce a material sample',instructions:'Refer to the buyer’s verified role. Ask which finishes their studio is evaluating.',version:1}];

export default function PreviewPage(){
  const agents=[
    {id:'demo-footwear',name:'Footwear sourcing',brief:'Find the person who buys leather for Wrenfield Footwear’s UK design team.'},
    {id:'demo-retail',name:'Retail partnerships',brief:'Find the partnerships buyer at Northline House who selects independent footwear brands.'}
  ].map(agent=>({...agent,salesSkills:sampleSkills,customSkillIds:['sample-introduction'],searchSource:'web',cadence:24,cap:5,delay:5,active:false,autoEmail:false,last:null}));
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
  return <Workspace preview={{bots:agents,salesConnectors,businessMemory,customSkills,leads:[],messages:[
    {id:'demo-user-1',botId:agents[0].id,role:'user',content:agents[0].brief},
    {id:'demo-agent-1',botId:agents[0].id,role:'assistant',content:'I can check Wrenfield’s sample staff profile for the buyer and draft an introduction. Run sample research to get started.'},
    {id:'demo-user-2',botId:agents[1].id,role:'user',content:agents[1].brief},
    {id:'demo-agent-2',botId:agents[1].id,role:'assistant',content:'I can check Northline’s sample profile for the partnerships buyer. Run sample research when you’re ready.'}
  ],events:[],mailbox:null,agentMailConnected:false,sampleLead:leads[0],sampleLeads:leads}}/>;
}
