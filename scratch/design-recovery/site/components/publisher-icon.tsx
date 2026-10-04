'use client';

import { useState } from 'react';
import type { Source } from '../content/stories';
import { Brand } from './brand';

export function PublisherIcon({source,className=''}:{source:Source;className?:string}) {
  const [failedUrl,setFailedUrl]=useState<string|null>(null);
  const origin=new URL(source.url).origin;
  const websiteIcon=origin==='https://esawebb.org'?'/examples/esa-webb-favicon.ico':origin==='https://www.esa.int'?'/examples/esa-favicon.ico':['https://www.nasa.gov','https://science.nasa.gov'].includes(origin)?'/examples/nasa-favicon.png':`${origin}/favicon.ico`;
  const url=source.type==='x'?'/examples/nasa-x-avatar-official-normal.jpg':websiteIcon;
  return <span className={`direct-source-icon publisher-icon publisher-icon-${source.type} ${className}`}>{failedUrl!==url?<img src={url} alt="" onError={()=>setFailedUrl(url)}/>:<Brand name={source.type}/>}</span>;
}
