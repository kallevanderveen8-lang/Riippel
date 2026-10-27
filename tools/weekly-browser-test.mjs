import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require=createRequire(import.meta.url);
let playwright;
try { playwright=require('playwright'); } catch { playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'); }
const port=Number(process.env.WEEKLY_TEST_PORT||4273),base=`http://localhost:${port}`;
const server=spawn(process.execPath,['tools/serve.mjs'],{stdio:'pipe',env:{...process.env,PORT:String(port)}});
let browser;
try {
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(`Weekly test server exited: ${code}`)));});
 browser=await playwright.chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1216,height:684}});
 await context.addInitScript(()=>{
   if(!localStorage.getItem('weekly-test-initialized')) {
     localStorage.setItem('weekly-test-initialized','yes');
     localStorage.setItem('ripple-pond-v1',JSON.stringify({version:1,level:42,tutorialDone:true,campaign:{number:42}}));
   }
   window.CrazyGames={SDK:{environment:'crazygames',init:async()=>{},game:{settings:{muteAudio:false},gameplayStart(){},gameplayStop(){},setGameContext(){},loadingStart(){},loadingStop(){}},data:{getItem:()=>localStorage.getItem('weekly-test-cloud'),setItem:(_,value)=>localStorage.setItem('weekly-test-cloud',value)}}};
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${base}/?test`);
 await page.waitForFunction(()=>window.__ripple?.state.level?.number===1);
 assert.equal(await page.locator('#welcome-dialog').isVisible(),true);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('weekly-test-cloud')).level),1);
 await page.click('#welcome-skip');
 await page.evaluate(()=>{window.__ripple.state.progress.level=6;window.__ripple.save();});
 await page.click('#collection-top');await page.click('#jump-goals');
 await page.click('#journal-weekly');
 await page.waitForFunction(()=>window.__ripple?.state.mode==='weekly'&&window.__ripple.state.level?.number===12);
 const seed=await page.evaluate(()=>window.__ripple.state.level.seed);
 await page.evaluate(()=>window.__ripple.solve());
 await page.waitForFunction(()=>window.__ripple.state.phase==='complete',{timeout:30000});
 const first=await page.evaluate(()=>{const p=window.__ripple.state.progress;return {best:Object.values(p.weeklyBest)[0],coins:p.tokens,week:Object.keys(p.weeklyBest)[0]};});
 assert.equal(first.best.stars,3);assert.ok(first.best.seconds>0);
 assert.match(await page.locator('#result-stats').innerText(),/Time/);
 await page.reload();await page.waitForFunction(()=>window.__ripple?.state.mode==='weekly'&&window.__ripple.state.phase==='complete');
 assert.equal(await page.evaluate(()=>window.__ripple.state.level.seed),seed);
 assert.equal(await page.evaluate(()=>window.__ripple.state.progress.tokens),first.coins);
 await page.click('#replay');await page.waitForFunction(()=>window.__ripple.state.phase==='ready');
 assert.equal(await page.evaluate(()=>window.__ripple.state.level.seed),seed);
 await page.evaluate(()=>window.__ripple.solve());await page.waitForFunction(()=>window.__ripple.state.phase==='complete');
 assert.equal(await page.evaluate(()=>window.__ripple.state.progress.tokens),first.coins);
 await page.click('#result-journal');await page.click('#jump-goals');
 assert.match(await page.locator('#weekly-teaser').innerText(),/Your best: 3★/);
 await page.click('#journal-settings');await page.click('#new-player');
 assert.equal(await page.locator('#new-player-dialog').isVisible(),true);
 await page.click('#new-player-confirm');
 await page.waitForFunction(()=>window.__ripple?.state.level?.number===1&&window.__ripple.state.progress.level===1);
 assert.equal(await page.locator('#welcome-dialog').isVisible(),true);
 assert.deepEqual(await page.evaluate(()=>window.__ripple.state.progress.weeklyBest),{});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('weekly-test-cloud')).level),1);
 assert.deepEqual(errors,[]);
 const local=await browser.newContext({viewport:{width:1216,height:684}});
 await local.addInitScript(()=>{
   localStorage.setItem('ripple-pond-v1',JSON.stringify({version:1,level:42,tutorialDone:true,campaign:{number:42}}));
   window.CrazyGames={SDK:{environment:'local',init:async()=>{},game:{gameplayStart(){},gameplayStop(){}},data:{getItem:()=>null,setItem(){}}}};
 });
 const localPage=await local.newPage();await localPage.goto(`${base}/?test`);
 await localPage.waitForFunction(()=>window.__ripple?.state.level?.number===42);
 assert.equal(await localPage.locator('#welcome-dialog').isVisible(),false);
 await local.close();
 console.log('PASS cloud account starts clean; tutorial; shared weekly puzzle, 3★ score, replay and reward persistence; confirmed new game');
 await context.close();
} finally { await browser?.close(); server.kill(); }
