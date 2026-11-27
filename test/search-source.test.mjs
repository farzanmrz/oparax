import test from 'node:test';
import assert from 'node:assert/strict';
import {SEARCH_SOURCE_CHOICES,normalizeSearchSource,normalizeSearchSources,selectedSearchSources,parseSearchSources,explicitSearchSource,requestingSourceChoice,sourceLabel} from '../lib/search-source.mjs';

test('button IDs and source names share canonical values',()=>{
  for(const {value,label} of SEARCH_SOURCE_CHOICES){
    assert.equal(normalizeSearchSource(value),value);assert.equal(normalizeSearchSource(label),value);assert.equal(sourceLabel(value),label);
  }
  assert.equal(normalizeSearchSource("LinkedIn’s Sales Navigator"),'sales_navigator');
  assert.equal(normalizeSearchSource('anywhere'),'');assert.equal(sourceLabel(''), '');
});
test('recognizes source selections in natural instructions and short answers',()=>{
  const cases=[
    ['Use LinkedIn','linkedin'],['LinkedIn','linkedin'],['LinkedIn, please.','linkedin'],
    ['Search LinkedIn for sourcing managers at Barbour','linkedin'],['LinkedIn, find buyers at Barbour','linkedin'],
    ['Find footwear buyers on LinkedIn.','linkedin'],['Use public sources to research Barbour','web'],
    ['Public web search, please','web'],['Look through the open web for people','web'],
    ['Pull via Sales Nav','sales_navigator'],["Use LinkedIn's Sales Navigator for this",'sales_navigator'],
    ['Research Barbour using Sales Navigator','sales_navigator'],['Sales Navigator as my source','sales_navigator'],
    ['Use public web and return LinkedIn profile URLs','web'],['Use LinkedIn rather than the web','linkedin'],
    ["Don't use LinkedIn; use the public web.",'web'],['Use Sales Navigator and write a LinkedIn draft','sales_navigator'],
  ];
  for(const [line,expected] of cases)assert.equal(explicitSearchSource(line),expected,line);
});
test('does not infer a source from the desired output or choose between alternatives',()=>{
  for(const line of ['Find Barbour buyers and return LinkedIn profile URLs','Write a LinkedIn draft',
    'Send an email, then message them on LinkedIn','Find prospects who have LinkedIn profiles','Use LinkedIn URLs in the report',
    'Find web developers at Barbour','Search web developers at Acme','Search LinkedIn employees in London','Use LinkedIn to send the message','Use my LinkedIn account to send a message',"Don't switch from the web to LinkedIn",'I already have a LinkedIn account','Choose either LinkedIn or the public web',
    'Search the public web and LinkedIn','Use LinkedIn/Sales Nav','Do not use LinkedIn','Would LinkedIn or Sales Navigator be better?',
    '',null,undefined])assert.equal(explicitSearchSource(line),'',String(line));
});

test('uses the new source on switches and searches inside the user’s authenticated account',()=>{
  const cases=[
    ['Switch from the public web to LinkedIn','linkedin'],['Switch from LinkedIn to Sales Navigator','sales_navigator'],
    ['Switch to my LinkedIn for this search','linkedin'],['Go to my LinkedIn and find buyers there','linkedin'],
    ['Search for footwear buyers in my LinkedIn Sales Navigator','sales_navigator'],['use my own authenticated LinkedIn','linkedin'],
    ['Look up prospects via my connected Sales Nav','sales_navigator'],['use LinkedIn to return profile links','linkedin']
  ];
  for(const [line,expected] of cases){assert.equal(explicitSearchSource(line),expected,line);assert.equal(requestingSourceChoice(line),false,line);}
});
test('unresolved source requests require a choice while ordinary text and output instructions do not',()=>{
  for(const line of ['use LinkedIn or Sales Navigator','Choose either LinkedIn or the public web','LinkedIn or Sales Navigator',
    'Switch from web to LinkedIn or Sales Navigator','Change my research source','Do not use the public web']){
    assert.equal(explicitSearchSource(line),'',line);assert.equal(requestingSourceChoice(line),true,line);
  }
  for(const line of ['Return LinkedIn profile URLs','Write a LinkedIn draft','Go to my LinkedIn and send the message',
    'Find buyers and return links to their LinkedIn profiles','Use the public web and return their LinkedIn profiles',
    'Use my LinkedIn account to send a message','Can you show all the saved results?']){
    assert.equal(requestingSourceChoice(line),false,line);
  }
});

test('normalizes five ordered, independent selections and honors empty saved preferences',()=>{
  assert.equal(SEARCH_SOURCE_CHOICES.length,5);
  assert.deepEqual(normalizeSearchSources(['Rocket Reach','public web','RocketReach','Email']),['rocketreach','web','email']);
  assert.deepEqual(normalizeSearchSources(['LinkedIn','not-a-source']),[]);
  assert.deepEqual(normalizeSearchSources('Sales Navigator'),['sales_navigator']);
  assert.deepEqual(selectedSearchSources({searchSource:'linkedin'}),['linkedin']);
  assert.deepEqual(selectedSearchSources({searchSource:'web',searchSources:[]}),[]);
  assert.deepEqual(selectedSearchSources({searchSource:'web',searchSources:['email','linkedin']}),['email','linkedin']);
});
test('multi-source instructions permit combined runs and intentional edits',()=>{
  const cases=[
    ['use LinkedIn',['linkedin'],'add'],
    ['both web and LinkedIn',['web','linkedin'],'replace'],
    ['Use web, LinkedIn, LinkedIn Sales Navigator, RocketReach, and Email',['web','linkedin','sales_navigator','rocketreach','email'],'replace'],
    ['Use Sales Navigator together with Rocket Reach',['sales_navigator','rocketreach'],'replace'],
    ['also use RocketReach',['rocketreach'],'add'],['add both RocketReach and email',['rocketreach','email'],'add'],
    ['drop web and email',['web','email'],'remove'],['remove LinkedIn',['linkedin'],'remove'],
    ['only email',['email'],'replace'],['LinkedIn only',['linkedin'],'replace'],
    ['Switch from the public web to LinkedIn',['linkedin'],'replace'],
    ['All five',['web','linkedin','sales_navigator','rocketreach','email'],'replace'],
    ['use all five sources except email',['web','linkedin','sales_navigator','rocketreach'],'replace'],
    ['find contacts via email',['email'],'add'],['search my inbox for buyers',['email'],'add'],
    ['Use LinkedIn, and email me their profile links',['linkedin'],'add'],
  ];
  for(const [line,sources,mode] of cases)assert.deepEqual(parseSearchSources(line),{sources,mode,ambiguous:false},line);
});
test('distinguishes alternate research sources from outreach and output requirements',()=>{
  for(const line of ['use LinkedIn or Sales Navigator','Choose between RocketReach and email','change my search source','add web and remove LinkedIn'])
    assert.deepEqual(parseSearchSources(line),{sources:[],mode:null,ambiguous:true},line);
  for(const line of ['Get an email address for this contact','email Alice about our prices','Find LinkedIn profile URLs with email addresses',
    'Write an email draft and a LinkedIn note','Use email to send the message','Companies that use RocketReach','We used all five buyers in the analysis'])
    assert.deepEqual(parseSearchSources(line),{sources:[],mode:null,ambiguous:false},line);
});

test('general web, mixed sources, and a separate delivery channel follow literal source selection',()=>{
  assert.deepEqual(parseSearchSources('Use a mix of LinkedIn, email, RocketReach and the general web').sources,['linkedin','email','rocketreach','web']);
  assert.deepEqual(parseSearchSources('Search the general web and Rocket Reach, then DM them on LinkedIn.').sources,['web','rocketreach']);
  assert.deepEqual(parseSearchSources('Find 50 footwear buyers across LinkedIn, email, RocketReach and the general web').sources,['linkedin','email','rocketreach','web']);
});
