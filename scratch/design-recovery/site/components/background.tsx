'use client';
import { useEffect,useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { AmbientWavesFive } from './ambient-five-waves';
import { AmbientThreadsFive } from './ambient-five-threads';
export function Background({dark,kind='waves'}:{dark:boolean;kind?:'waves'|'threads'}) {
const reduced=useReducedMotion();const [finished,setFinished]=useState(false);const [visible,setVisible]=useState(true);
useEffect(()=>{const timer=setTimeout(()=>setFinished(true),4500);const visibility=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',visibility);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};},[]);
const running=!reduced&&!finished&&visible;
return <div aria-hidden="true" className={`library-background library-background-${kind}`}>{kind==='threads'?<AmbientThreadsFive dark={dark} running={running}/>:<AmbientWavesFive dark={dark} running={running}/>}</div>;
}
