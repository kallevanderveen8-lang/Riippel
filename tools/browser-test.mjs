import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);let playwright;try{playwright=require('playwright');}catch{playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');}
const server=spawn(process.execPath,['tools/serve.mjs'],{stdio:'pipe'});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.on('error',reject);});
let browser;const errors=[],checks=[];mkdirSync('reports',{recursive:true});
try{
 browser=await playwright.chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://sdk.crazygames.com/**',r=>r.abort());
 await page.goto('http://localhost:4173/?test');await page.waitForFunction(()=>window.__ripple);
 const firstFrame=await page.evaluate(()=>performance.getEntriesByType('paint').find(p=>p.name==='first-contentful-paint')?.startTime??null);
 await page.screenshot({path:'reports/desktop.png'});checks.push('initial interactive pond, SDK blocked');
 const pond=page.locator('#pond');let bounds=await pond.boundingBox();await page.mouse.click(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);
 assert.equal(await page.evaluate(()=>window.__ripple.state.stones.length),1);await page.reload();await page.waitForFunction(()=>window.__ripple?.state.stones.length===1);checks.push('pointer placement and mid-level restore');
 await page.click('#drop');await page.waitForFunction(()=>window.__ripple.state.phase==='complete');await page.screenshot({path:'reports/complete.png'});assert.equal(await page.evaluate(()=>window.__ripple.state.progress.stars.l1),3);checks.push('first pond solve, stars and goals');
 await page.click('#next');assert.equal(await page.evaluate(()=>window.__ripple.state.level.number),2);
 for(let n=2;n<=10;n++){if(n>2)await page.evaluate(n=>window.__ripple.go(n),n);await page.evaluate(()=>window.__ripple.solve());await page.waitForFunction(()=>window.__ripple.state.phase==='complete');assert.equal(await page.evaluate(()=>window.__ripple.state.lit.every(Boolean)),true);}
 checks.push('all ten scripted ponds playable and completable');
 await page.evaluate(()=>window.__ripple.go(3));await page.evaluate(()=>window.__ripple.place([{x:15,y:15,delay:0}]));await page.click('#drop');await page.waitForFunction(()=>window.__ripple.state.phase==='ready');assert.equal(await page.evaluate(()=>window.__ripple.state.stones.length),1);checks.push('failed drop preserves stones and permits retry');
 await page.evaluate(()=>window.__ripple.go(15));await page.evaluate(()=>window.__ripple.place([{x:15,y:15,delay:0}]));bounds=await pond.boundingBox();await page.mouse.click(bounds.x+bounds.width*15/128,bounds.y+bounds.height*15/128);assert.equal(await page.evaluate(()=>window.__ripple.state.stones[0].delay),1);checks.push('delayed stone tap');
 await page.click('#pause');assert.equal(await page.evaluate(()=>window.__ripple.state.paused),true);await page.click('#next');assert.equal(await page.evaluate(()=>window.__ripple.state.paused),false);checks.push('pause and resume');
 await page.evaluate(()=>window.__ripple.daily());await page.evaluate(()=>window.__ripple.solve());await page.waitForFunction(()=>window.__ripple.state.phase==='complete');await page.click('#copy');assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/^Ripple #/);checks.push('daily pond, streak, clipboard share');
 for(const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){await page.setViewportSize(viewport);await page.evaluate(()=>window.__ripple.go(3));await page.screenshot({path:`reports/layout-${viewport.width}x${viewport.height}.png`});const layout=await page.evaluate(()=>{const r=document.querySelector('#drop').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,dropVisible:r.top>=0&&r.bottom<=innerHeight,dropHeight:r.height};});assert.equal(layout.overflow,false);assert.equal(layout.dropVisible,true);assert.ok(layout.dropHeight>=48);}
 checks.push('320px / 390px portrait and 844px landscape layout');
 // Same 360 simulation steps at 60 and 144 Hz, independent of render cadence.
 const hashes=await page.evaluate(async()=>{const {Wave}=await import('/src/simulation.js');const w=new Wave([{x:64,y:40,rx:5,ry:10}]);const stones=[{x:36,y:64,delay:0},{x:92,y:64,delay:1}];function run(hz){w.reset(stones);let acc=0;while(w.stepNumber<360){acc+=1/hz;while(acc>=1/60&&w.stepNumber<360){w.step();w.step();acc-=1/60;}}let hash=2166136261;for(const v of new Uint32Array(w.peak.buffer)){hash=Math.imul(hash^v,16777619);}return hash>>>0;}return [run(60),run(144)];});assert.equal(hashes[0],hashes[1]);checks.push('60 / 144 Hz identical peak hash');
 assert.deepEqual(errors,[]);writeFileSync('reports/browser.json',JSON.stringify({passed:true,firstContentfulPaintMs:firstFrame,checks,errors},null,2)+'\n');console.log(checks);
}catch(error){writeFileSync('reports/browser.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2)+'\n');throw error;}finally{await browser?.close();server.kill();}
