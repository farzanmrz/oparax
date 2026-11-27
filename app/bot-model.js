'use client';
import {MODEL_CHOICES,normalizeModelPreference} from '../lib/agent-models.mjs';

export default function BotModel({agent,busy,onAction,isDemo}){
  const choice=MODEL_CHOICES.find(option=>option.id===normalizeModelPreference(agent.modelPreference));
  const actual=agent.lastModelUsage;
  return <section className="bot-model">
    <label>Bot model<select value={choice.id} disabled={busy||isDemo} onChange={e=>onAction('setModelPreference',{id:agent.id,modelPreference:e.target.value})}>
      {MODEL_CHOICES.map(option=><option value={option.id} key={option.id}>{option.label}</option>)}
    </select></label>
    <p>{choice.description} {choice.model&&<a href={choice.sourceUrl} target="_blank" rel="noreferrer">${choice.input} input / ${choice.output} output per million text tokens ↗</a>}</p>
    <p>Public search uses Sonar. Visual source checks use Claude.</p>
    {actual?.modelId&&<p>Last model used · {actual.modelId}{Number.isFinite(actual.costUsd)?' · '+(actual.costBasis==='gateway'?'reported':'estimated')+' $'+actual.costUsd.toLocaleString('en-US',{maximumFractionDigits:6}):''}</p>}
  </section>;
}
