// Called only for an SDK response from the fixed perplexity/sonar-pro model.
// Source titles and per-source provider metadata are optional in the AI SDK.
export function sonarSources(result) {
  if(!Array.isArray(result?.steps)||!result.steps.length)throw new Error('Sonar returned no provider response.');
  const hits=new Map(),queries=new Set();
  function add(raw) {
    const item=typeof raw==='string'?{url:raw}:raw;
    if(typeof item?.url!=='string')return;
    let url;
    try {url=new URL(item.url);}catch{return;}
    if(url.protocol!=='https:'||url.username||url.password)return;
    url.hash='';
    const key=url.href;
    const current=hits.get(key)||{url:key,title:'',snippet:''};
    const title=typeof item.title==='string'?item.title.trim().slice(0,500):'';
    const snippet=typeof item.snippet==='string'?item.snippet.trim().slice(0,12000):'';
    if(title&&!current.title)current.title=title;
    if(snippet.length>current.snippet.length)current.snippet=snippet;
    hits.set(key,current);
  }
  for(const step of result.steps){
    const body=step.response?.body, meta=step.providerMetadata?.perplexity;
    if(step.finishReason==='error'||body?.error){
      const error=new Error('Sonar reported a provider error.');
      const status=Number(body?.error?.statusCode??body?.error?.status??body?.error?.code);
      if(Number.isInteger(status)&&status>=400&&status<=599)error.statusCode=status;
      throw error;
    }
    for(const source of step.sources||[]){
      if(source.sourceType!=='url')continue;
      add({url:source.url,title:source.title,snippet:source.providerMetadata?.perplexity?.snippet});
    }
    // Rich search results join URL-only citations on the same exact URL.
    for(const rows of [meta?.searchResults,meta?.search_results,body?.search_results,body?.citations]){
      if(Array.isArray(rows))rows.forEach(add);
    }
    if(Array.isArray(meta?.searchQueries))for(const q of meta.searchQueries)if(typeof q==='string'&&q.trim())queries.add(q.trim());
  }
  return {hits:[...hits.values()],queries:[...queries]};
}
