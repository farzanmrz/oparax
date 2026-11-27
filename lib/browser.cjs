// All network reads are pinned by verify.py. The page cannot submit forms or open other origins.
const fs=require('node:fs'), {execFile}=require('node:child_process'), {promisify}=require('node:util');
const run=promisify(execFile);
(async()=>{const {default:chromium}=await import('@sparticuz/chromium');const puppeteer=require('puppeteer-core');
const {url,actions}=JSON.parse(fs.readFileSync('visual-input.json','utf8')), origin=new URL(url).origin;
const browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--disable-background-networking','--disable-sync','--host-resolver-rules=MAP * ~NOTFOUND'],headless:true});
try{const page=await browser.newPage();await page.setViewport({width:1000,height:730});await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);
page.on('request',async r=>{try{const u=new URL(r.url());if(r.method()!=='GET'||u.origin!==origin||!['document','stylesheet','image'].includes(r.resourceType())||/login|sign-in|signin|logout|unsubscribe|checkout/i.test(u.pathname))return await r.abort();const {stdout}=await run('python3',['verify.py','--resource',u.href],{maxBuffer:1800000,timeout:11000});const data=JSON.parse(stdout);await r.respond({status:200,contentType:data.mime,body:Buffer.from(data.body,'base64')})}catch{await r.abort().catch(()=>{})}});
await page.goto(url,{waitUntil:'domcontentloaded',timeout:18000});
for(const a of actions){if(a.action==='scroll'){await page.mouse.wheel({deltaY:a.y});await new Promise(resolve=>setTimeout(resolve,250))}else if(a.action==='click'){const href=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('a')?.href,a);if(href&&new URL(href).origin===origin&&!/login|sign-in|signin|logout|unsubscribe|checkout/i.test(new URL(href).pathname))await page.goto(href,{waitUntil:'domcontentloaded',timeout:15000});}}
const shot=await page.screenshot({type:'jpeg',quality:65});fs.writeFileSync('visual-screen.jpg',shot);console.log(page.url());
}finally{await browser.close()}})().catch(()=>{process.exitCode=1});
