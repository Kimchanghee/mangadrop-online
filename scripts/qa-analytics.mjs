import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../../_qa-tools/node_modules/playwright');
const root=resolve('dist');
const server=createServer((req,res)=>{let p=join(root,decodeURIComponent(req.url.split('?')[0]));if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');if(!p.startsWith(root)||!existsSync(p)){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'})[extname(p)]||'application/octet-stream');res.end(readFileSync(p));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;const results=[];let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});mkdirSync('qa/screens',{recursive:true});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});const requests=[];const hostInjected=[];
  await context.route('**/*',route=>{const u=route.request().url();if(!u.startsWith(origin)){if(new URL(u).hostname.endsWith('.kaspersky-labs.com'))hostInjected.push(u);else requests.push(u);return route.abort();}return route.continue();});
  const page=await context.newPage();await page.goto(origin);console.log(await page.locator('.analytics-consent').ariaSnapshot());await page.waitForTimeout(150);
  assert.equal(requests.length,0,'undecided sends no third party request');
  await page.locator('#analytics-decline').click();await page.reload();await page.waitForTimeout(150);assert.equal(requests.length,0,'persisted denial sends no request');
  await page.locator('#analytics-change').click();
  const geometry=await page.locator('.analytics-consent').evaluate(el=>{const buttons=[...el.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,buttons,position:getComputedStyle(el).position};});
  assert.equal(geometry.scroll,width);assert.equal(geometry.position,'static');for(const b of geometry.buttons){assert.ok(b.height>=44&&b.width>=44);assert.ok(b.x>=0&&b.x+b.width<=width);}
  for(let a=0;a<geometry.buttons.length;a++)for(let b=a+1;b<geometry.buttons.length;b++){const x=geometry.buttons[a],y=geometry.buttons[b];assert.ok(x.x+x.width<=y.x||y.x+y.width<=x.x||x.y+x.height<=y.y||y.y+y.height<=x.y,'buttons do not overlap');}
  await page.locator('.analytics-consent').screenshot({path:`qa/screens/analytics-${width}.png`});
  await page.locator('#analytics-accept').click();await page.waitForTimeout(150);
  assert.equal(requests.length,1);assert.equal(requests[0],'https://www.googletagmanager.com/gtag/js?id=G-388R5752FD');
  const commands=await page.evaluate(()=>window.dataLayer.map(a=>Array.from(a)));
  assert.equal(commands[0][2].analytics_storage,'denied');assert.equal(commands[1][2].analytics_storage,'granted');
  for(const command of commands.filter(x=>x[0]==='consent'))for(const k of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(command[2][k],'denied');
  assert.equal(commands.find(x=>x[0]==='config')[1],'G-388R5752FD');assert.equal(commands.find(x=>x[0]==='config')[2].allow_google_signals,false);
  await page.reload();await page.waitForTimeout(150);assert.equal(requests.length,2,'persisted explicit accept loads once per document');
  // Synthetic first-party cookies test deletion only, not evidence that Google issued cookies.
  await context.addCookies([{name:'_ga',value:'synthetic',url:origin},{name:'_ga_388R5752FD',value:'synthetic',url:origin},{name:'unrelated',value:'keep',url:origin}]);
  await page.locator('#analytics-change').click();await Promise.all([page.waitForEvent('load'),page.locator('#analytics-decline').click()]);await page.waitForTimeout(150);
  assert.equal(requests.length,2,'withdrawal sends no further Google requests');
  assert.equal(await page.evaluate(()=>window['ga-disable-G-388R5752FD']),true);
  assert.equal(await page.evaluate(()=>typeof window.gtag),'undefined');
  const cookies=await context.cookies();assert.ok(!cookies.some(c=>c.name==='_ga'||c.name==='_ga_388R5752FD'));assert.ok(cookies.some(c=>c.name==='unrelated'));
  await page.goto(origin+'/privacy/');await page.waitForTimeout(150);assert.equal(requests.length,2,'withdrawal survives navigation');
  assert.equal(await page.locator('script[src*="adsbygoogle"],ins.adsbygoogle').count(),0);
  results.push({width,geometry,hostInjectedAborted:hostInjected.length,undecidedRequests:0,deniedRequests:0,acceptedLoaderRequests:2,postWithdrawalRequests:0,ownCookieDeletion:true,unrelatedCookiePreserved:true,adConsents:'denied',googleScriptAborted:true});
  await context.close();
 }
 writeFileSync('qa/analytics-qa.json',JSON.stringify({observedAt:new Date().toISOString(),scope:'Intercepted/aborted Google loader; queued commands verified, not GA ingestion or account evidence',results},null,2));console.log(JSON.stringify(results));
}finally{await browser?.close();await new Promise(r=>server.close(r));}


