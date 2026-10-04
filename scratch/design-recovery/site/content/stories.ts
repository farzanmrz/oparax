import { fiveEvidence as nasa } from './evidence';
export type Source = { name: string; type: 'x' | 'web'; title: string; url: string; text: string };
export type Story = { id: string; title: string; date: string; topic: string; summary: string; facts: string[]; sources: Source[]; image?: string; imageCredit?: string };
export const sources: Source[] = [
  { name: '@NASA', type: 'x', title: 'Europa Clipper has launched', url: nasa.post.url, text: nasa.post.excerpt },
  { name: 'NASA', type: 'web', title: nasa.article.headline, url: nasa.article.url, text: nasa.article.summary },
  { name: 'NASA Science', type: 'web', title: nasa.followup.headline, url: nasa.followup.url, text: nasa.followup.summary },
];
export const stories: Story[] = [
  { id: 'europa', title: 'Europa Clipper is on its way to Jupiter', date: 'Oct 14, 2024', topic: 'Planetary missions', summary: 'A launch, a mission briefing and a solar-array update. One story about the journey to Europa.', facts: [nasa.story.firstFact, nasa.story.secondFact, nasa.story.addedFact], sources, image: nasa.article.image, imageCredit: nasa.article.imageCredit },
  { id: 'euclid', title: 'The first piece of Euclid’s cosmic atlas is here', date: 'Oct 15, 2024', topic: 'Space telescopes', summary: 'ESA has released the first part of Euclid’s map of the Universe, showing millions of stars and galaxies.', facts: ['The first piece of the map was revealed on October 15, 2024.', 'NASA reports that this first piece contains around 100 million stars and galaxies.'], sources: [{name: 'ESA', type: 'web',title:'The first page of Euclid’s cosmic atlas',text:'ESA released the first piece of the mission’s map of the Universe.',url:'https://www.esa.int/Science_Exploration/Space_Science/Euclid/Zoom_into_the_first_page_of_ESA_Euclid_s_great_cosmic_atlas'},{name:'NASA',type:'web',title:'A glimpse of Euclid’s cosmic atlas',text:'The first piece contains around 100 million stars and galaxies.',url:'https://www.nasa.gov/missions/euclid/snippet-of-euclid-missions-cosmic-atlas-released-by-esa/'}] },
  { id: 'webb', title: 'Webb finds brown dwarf candidates beyond the Milky Way', date: 'Oct 23, 2024', topic: 'Space telescopes', summary: 'Observations of the young cluster NGC 602 reveal a population of brown dwarf candidates in the Small Magellanic Cloud.', facts:['The candidates were identified using the James Webb Space Telescope.', 'NGC 602 lies in the Small Magellanic Cloud, outside the Milky Way.'],sources:[{name:'ESA/Webb',type:'web',title:'Brown dwarf candidates outside the Milky Way',text:'The findings concern candidate objects in the young star cluster NGC 602.',url:'https://esawebb.org/news/weic2425/'}]},
];
export const copy = {
  hero: 'Your sources. One story. Delivered.',
  intro: 'Oparax follows your interests, connects related reports and brings you the stories that matter.',
  beat: 'Space missions & discovery',
  interest: 'Planetary missions, ocean worlds and space telescopes.',
  historical: 'Historical reports from October 2024. Explore the proposed experience with local sample data.',
  signup: 'Sign Up',
  plans: [ {name:'Hobby',price:'$5',posts:'100',cadence:'Daily'}, {name:'Creator',price:'$30',posts:'3,000',cadence:'Daily'}, {name:'Wire',price:'$99',posts:'4,000',cadence:'Every 15 minutes'} ],
  roadmap: [
    {title:'Social & communities',items:[
      {id:'instagram',label:'Instagram'},{id:'reddit',label:'Reddit'},{id:'linkedin',label:'LinkedIn'},
      {id:'facebook',label:'Facebook'},{id:'tiktok',label:'TikTok'},{id:'threads',label:'Threads'},
      {id:'hackernews',label:'Hacker News'},{id:'bluesky',label:'Bluesky'},{id:'pinterest',label:'Pinterest'},
      {id:'snapchat',label:'Snapchat'},{id:'substack',label:'Substack'},{id:'truthsocial',label:'Truth Social'},
      {id:'douyin',label:'Douyin'},{id:'rednote',label:'RedNote'},{id:'weibo',label:'Weibo'},{id:'zhihu',label:'Zhihu'}
    ]},
    {title:'News, search & publishing',items:[
      {id:'bbc',label:'BBC'},{id:'reuters',label:'Reuters'},{id:'nytimes',label:'The New York Times'},
      {id:'googlenews',label:'Google News'},{id:'medium',label:'Medium'},{id:'google',label:'Google Search'},
      {id:'bing',label:'Bing'},{id:'naver',label:'Naver'},{id:'perplexity',label:'Perplexity'},{id:'semrush',label:'Semrush'}
    ]},
    {title:'Video, markets & knowledge',items:[
      {id:'youtube',label:'YouTube'},{id:'spotify',label:'Spotify'},{id:'googlemaps',label:'Google Maps'},
      {id:'indeed',label:'Indeed'},{id:'yahoofinance',label:'Yahoo Finance'},{id:'coinmarketcap',label:'CoinMarketCap'},
      {id:'pexels',label:'Pexels'},{id:'unsplash',label:'Unsplash'}
    ]},
    {title:'Alert destinations',items:[
      {id:'gmail',label:'Gmail'},{id:'microsoftoutlook',label:'Outlook'},{id:'slack',label:'Slack'},
      {id:'microsoftteams',label:'Teams'},{id:'discord',label:'Discord'},{id:'telegram',label:'Telegram'},
      {id:'whatsapp',label:'WhatsApp'},{id:'message',label:'Text messages'}
    ]},
  ],
};
