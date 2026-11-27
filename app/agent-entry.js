'use client';
import {useRef,useState} from 'react';
import './agent-entry.css';

const draftKey='oparax.sales.signinBrief';
const sessionWindow=60*60*1000;
const examples=[
  ['Find buyers','Find 50 footwear buyers at UK retailers. Verify each person’s current employer and LinkedIn profile.'],
  ['Research an account','Find the people responsible for buying leather at Barbour. Show me the sources for each match.']
];

function emailKey(email){return String(email||'').trim().toLowerCase();}
export function clearPendingBrief(){try{localStorage.removeItem(draftKey);}catch{}}
export function getPendingBrief(email){
  if(!emailKey(email))return '';
  try{
    const saved=JSON.parse(localStorage.getItem(draftKey)||'null');
    if(!saved)return '';
    if(saved.expires<Date.now()||saved.email!==emailKey(email)||typeof saved.text!=='string'){
      clearPendingBrief();
      return '';
    }
    return saved.text;
  }catch{return '';}
}
function bindBrief(text,email){
  clearPendingBrief();
  if(!text.trim())return;
  try{localStorage.setItem(draftKey,JSON.stringify({text:text.trim(),email:emailKey(email),expires:Date.now()+sessionWindow}));}catch{}
}
function Arrow(){return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;}

export default function AgentEntry({busy,ready,sent,notice,auth,login,logout,initialPage}){
  const direct=initialPage==='Prospects'||initialPage==='Research';
  const [step,setStep]=useState(direct?'signin':'brief');
  const [brief,setBrief]=useState('');
  const input=useRef(null);
  const signin=step==='signin'||sent||auth;
  function submitEmail(event){
    bindBrief(brief,new FormData(event.currentTarget).get('email'));
    return login(event);
  }
  function start(event){
    event.preventDefault();
    if(brief.trim())setStep('signin');
    else input.current?.focus();
  }
  return <main className="agent-entry">
    <header className="ae-nav"><a className="brand" href="/" aria-label="Oparax home"><span className="mark" aria-hidden="true"/>Oparax</a>
      {!signin&&<button className="ae-signin" onClick={()=>setStep('signin')}>Sign in <Arrow/></button>}
    </header>
    <section className="ae-stage">
      {signin?<div className="ae-card ae-auth">
        <span className="ae-caption">OPARAX SALES AGENT</span>
        <h1>{sent?'Check your email.':auth?'Opening your workspace…':initialPage==='Prospects'?'Open your prospects.':'Open your workspace.'}</h1>
        {auth?<>{notice}<button type="button" onClick={logout}>Switch account</button></>:<>
          <p className="ae-desc">{sent?<>We sent a sign-in link to <strong>{sent}</strong>.</>:brief.trim()?'Sign in to take this brief into your workspace.':'Sign up or sign in with any email address.'}</p>
          {brief.trim()&&!sent&&<blockquote className="ae-quote">{brief}</blockquote>}
          <form onSubmit={submitEmail} className="ae-form">
            <label htmlFor="ae-email">Email address</label>
            <input id="ae-email" type="email" name="email" autoComplete="email" required placeholder="you@example.com" />
            <button className="ae-submit primary" disabled={busy||!ready}>{busy?'Sending…':sent?'Send another link':'Email me a sign-in link'} <Arrow/></button>
          </form>{notice}
          {!sent&&!direct&&<button type="button" className="ae-link" onClick={()=>setStep('brief')}>{brief.trim()?'Edit your brief':'Write a brief'}</button>}
        </>}
      </div>:<div className="ae-card">
        <span className="ae-caption"><span aria-hidden="true" className="ae-beacon"/>SALES AGENT</span>
        <h1>Who should we<br/><em>reach?</em></h1>
        <p className="ae-desc">Give your agent a market or an account. Choose where to look, review verified buyers, and draft your first introduction.</p>
        <form className="ae-composer" onSubmit={start}>
          <textarea aria-label="Your sales research brief" ref={input} maxLength={2000} rows={3} placeholder="Find sourcing directors at UK footwear brands…" value={brief} onChange={e=>setBrief(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){start(e);}}}/>
          <div className="ae-controls"><span>New agent brief</span><button className="ae-continue primary" type="submit" disabled={!brief.trim()}>Continue <Arrow/></button></div>
        </form>
        <div className="ae-examples">{examples.map(([label,value])=><button key={label} type="button" onClick={()=>{setBrief(value);input.current?.focus();}}>{label}<span aria-hidden="true">↗</span></button>)}</div>
        {notice}
      </div>}
    </section>
    <footer className="ae-footer"><span className="ae-wordmark">Oparax</span><a href="/preview">Explore a sample agent <span aria-hidden="true">↗</span></a></footer>
  </main>;
}
