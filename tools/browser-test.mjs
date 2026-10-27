import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);let playwright;
  async function openJournal() {
    if (await page.locator('#overlay').isHidden()) await page.click('#pause');
    await page.click(await page.locator('#overlay').evaluate(e=>e.classList.contains('is-paused')) ? '#collection-mobile' : '#result-journal');
  }
  async function closeJournal(button='#journal-back') {
    await page.click(button);
    if (await page.locator('#overlay').evaluate(e=>!e.hidden&&e.classList.contains('is-paused'))) await page.click('#next');
  }
try{playwright=require('playwright');}catch{playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');}
const port=Number(process.env.TEST_PORT||4174), base=`http://localhost:${port}`;
const server=spawn(process.execPath,['tools/serve.mjs'],{stdio:'pipe',env:{...process.env,PORT:String(port)}});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.on('error',reject);});
let browser,page,sdkBlocked=0;const errors=[],checks=[];mkdirSync('reports',{recursive:true});
try{
 browser=await playwright.chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://sdk.crazygames.com/**',r=>{sdkBlocked++;return r.abort();});
 await page.goto(`${base}/?test&sdk`);await page.waitForFunction(()=>window.__ripple);
 await page.click('#welcome-skip');
 const firstFrame=await page.evaluate(()=>performance.getEntriesByType('paint').find(p=>p.name==='first-contentful-paint')?.startTime??null);
 await page.screenshot({path:'reports/desktop.png'});await page.evaluate(()=>window.__ripple.go(8));await page.screenshot({path:'reports/rocks.png'});await page.evaluate(()=>window.__ripple.go(1));checks.push('initial interactive pond, SDK blocked');
 const pond=page.locator('#pond');let bounds=await pond.boundingBox();let view=await page.evaluate(()=>window.__ripple.state.view);await page.mouse.click(bounds.x+view.x+view.width*.5,bounds.y+view.y+view.height*.5);
 assert.equal(await page.evaluate(()=>window.__ripple.state.stones.length),1);await page.reload();await page.waitForFunction(()=>window.__ripple?.state.stones.length===1);checks.push('pointer placement and mid-level restore');
 const originalStone=await page.evaluate(()=>({...window.__ripple.state.stones[0]}));
 const stoneX=bounds.x+view.x+view.width*originalStone.x/128, stoneY=bounds.y+view.y+view.height*originalStone.y/128;
 await page.mouse.move(stoneX,stoneY);await page.mouse.down();
 await pond.dispatchEvent('pointerdown',{pointerId:99,pointerType:'touch',clientX:stoneX+100,clientY:stoneY});
 await page.mouse.move(stoneX+80,stoneY+60);
 assert.notDeepEqual(await page.evaluate(()=>window.__ripple.state.stones[0]),originalStone);
 await page.evaluate(()=>document.getElementById('pause').click());await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>window.__ripple.state.stones[0]),originalStone);
 await page.reload();await page.waitForFunction(()=>window.__ripple?.state.stones.length===1);
 assert.deepEqual(await page.evaluate(()=>window.__ripple.state.stones[0]),originalStone);
 checks.push('second pointer cannot steal a drag; pause rolls back and saves the original stone');
 await page.click('#drop');await page.waitForTimeout(500);await page.screenshot({path:'reports/waves.png'});await page.waitForFunction(()=>window.__ripple.state.phase==='complete');await page.screenshot({path:'reports/complete.png'});assert.equal(await page.evaluate(()=>window.__ripple.state.progress.stars.l1),3);await page.waitForFunction(()=>window.__ripple.state.step>=360);await page.screenshot({path:'reports/waves-fullscreen.png'});checks.push('first pond solve, stars and full-screen wave continuation');
 await page.click('#next');assert.equal(await page.evaluate(()=>window.__ripple.state.level.number),2);
 await page.evaluate(()=>{window.adBreakCalls=[];window.__ripple.portal.ad=(type,count)=>{window.adBreakCalls.push({type,count,mode:window.__ripple.state.mode});return Promise.resolve(false);};});
 for(let n=2;n<=10;n++){if(n>2)await page.evaluate(n=>window.__ripple.go(n),n);await page.evaluate(()=>window.__ripple.solve());await page.waitForFunction(()=>window.__ripple.state.phase==='complete');assert.equal(await page.evaluate(()=>window.__ripple.state.lit.every(Boolean)),true);}
 assert.deepEqual(await page.evaluate(()=>window.adBreakCalls),[{type:'midgame',count:5,mode:'campaign'},{type:'midgame',count:10,mode:'campaign'}]);
 assert.ok(await page.evaluate(()=>window.__ripple.state.progress.chapters[0]&&window.__ripple.state.progress.chapters[1]));checks.push('all ten scripted ponds completable; chapter rewards');
 await page.click('#result-journal');
 assert.equal(await page.locator('#collection-dialog').evaluate(e=>e.open),true);
 await page.click('#page-back');
 assert.match(await page.locator('#mastery-progress').innerText(),/30\/30 stars/);
 assert.equal(await page.locator('#lake-list button').count(),10);
 await page.click('#jump-keepsakes');
 assert.ok(await page.locator('.discovery.ready').count()>=3);
 assert.ok(await page.locator('[data-discovery="postcard-0"] .postcard-art').count()===1);
 await page.locator('.claim-milestone').first().click();
 assert.equal(await page.locator('#reward-toast').isVisible(),true);
 while(await page.locator('.claim-milestone').count())await page.locator('.claim-milestone').first().click();
 assert.ok(await page.locator('.discovery.earned').count()>=3);
 assert.equal(await page.locator('#theme-options button').count(),2);
 await page.screenshot({path:'reports/journal.png'});await closeJournal('#close-dialog');
 await page.reload();await page.waitForFunction(()=>window.__ripple?.state.phase==='complete');
 assert.ok(await page.evaluate(()=>window.__ripple.state.progress.mastery[1]&&window.__ripple.state.progress.discoveries['ten-perfect']));
 checks.push('result opens Collection; ten-level lake, claimed milestones and mastery survive reload');
 await page.evaluate(()=>window.__ripple.go(3));await page.evaluate(()=>window.__ripple.place([{x:36,y:64,delay:0}]));await page.click('#drop');await page.waitForFunction(()=>window.__ripple.state.phase==='ready');assert.equal(await page.evaluate(()=>window.__ripple.state.stones.length),1);assert.match(await page.locator('#instruction').innerText(),/marked lantern|faint rings/);await page.waitForTimeout(4400);assert.equal(await page.locator('#feedback').isVisible(),true);checks.push('failed drop preserves stones and keeps actionable guidance visible until the next edit');
 await page.evaluate(()=>window.__ripple.go(6));await page.evaluate(()=>window.__ripple.place([{x:36,y:64,delay:0}]));for(let i=0;i<2;i++){await page.click('#drop');await page.waitForFunction(()=>window.__ripple.state.phase==='ready');}const hints=await page.evaluate(()=>window.__ripple.state.progress.tokens);await page.click('#help-open');await page.click('#hint');assert.ok(await page.evaluate(()=>window.__ripple.state.paused));assert.equal(await page.locator('#hint-token').isHidden(),true);await page.click('#hint-free');assert.equal(await page.evaluate(()=>window.__ripple.state.progress.tokens),hints);assert.equal(await page.evaluate(()=>window.__ripple.state.paused),false);checks.push('first stuck hint is free and never exposes a paid option in its place');
 await page.click('#help-open');await page.click('#hint');await page.click('#hint-token');assert.equal(await page.evaluate(()=>window.__ripple.state.progress.tokens),hints-1);checks.push('further early guidance consumes exactly one coin');
 for(let i=0;i<2;i++){await page.click('#drop');await page.waitForFunction(()=>window.__ripple.state.phase==='ready');}
 const freeBalance=await page.evaluate(()=>window.__ripple.state.progress.tokens);
 await page.click('#help-open');await page.click('#hint');await page.click('#hint-free');
 assert.equal(await page.evaluate(()=>window.__ripple.state.progress.tokens),freeBalance);
 for(let i=0;i<2;i++){await page.click('#drop');await page.waitForFunction(()=>window.__ripple.state.phase==='ready');}
 await page.click('#help-open');await page.click('#hint');await page.click('#hint-guide');
 assert.deepEqual(await page.evaluate(()=>window.__ripple.state.stones),await page.evaluate(()=>window.__ripple.state.level.solution));
 assert.equal(await page.evaluate(()=>window.__ripple.state.progress.tokens),freeBalance);
 await page.reload();await page.waitForFunction(()=>window.__ripple?.state.stones.length>0);
 await page.click('#drop');await page.waitForFunction(()=>window.__ripple.state.phase==='complete');
 checks.push('further free hints after four failures; guided layout after six saves and solves');
 await page.evaluate(()=>window.__ripple.go(15));await page.waitForFunction(()=>window.__ripple.state.elapsed > .1);checks.push('frame loop survives asynchronous procedural level loading');await page.evaluate(()=>window.__ripple.place([{x:15,y:15,delay:0}]));bounds=await pond.boundingBox();view=await page.evaluate(()=>window.__ripple.state.view);await page.mouse.click(bounds.x+view.x+view.width*15/128,bounds.y+view.y+view.height*15/128);assert.equal(await page.evaluate(()=>window.__ripple.state.stones[0].delay),1);checks.push('delayed stone tap');
 await page.click('#pause');assert.equal(await page.evaluate(()=>window.__ripple.state.paused),true);await page.click('#next');assert.equal(await page.evaluate(()=>window.__ripple.state.paused),false);checks.push('pause and resume');await openJournal();assert.equal(await page.locator('#collection-dialog').evaluate(e=>e.open),true);await closeJournal('#close-dialog');assert.equal(await page.evaluate(()=>window.__ripple.state.paused),false);checks.push('collection drawer opens and resumes play');
 await page.evaluate(()=>window.__ripple.daily());const dailyBalance=await page.evaluate(()=>window.__ripple.state.progress.tokens);
 const dailyOpening=await page.evaluate(()=>({par:window.__ripple.state.level.par,rocks:window.__ripple.state.level.rocks.length,lanterns:window.__ripple.state.level.lanterns.length,stone:window.__ripple.state.level.solution[0],view:window.__ripple.state.view}));
 assert.deepEqual([dailyOpening.par,dailyOpening.rocks,dailyOpening.lanterns],[1,0,2]);
 for(let i=0;i<3;i++){if(i===1){await page.evaluate(()=>window.__ripple.place(window.__ripple.state.level.solution.map(s=>({...s}))));const placed=await page.evaluate(()=>window.__ripple.state.stones);await page.reload();await page.waitForFunction(()=>window.__ripple?.state.mode==='daily'&&window.__ripple.state.dailyStage===1);assert.deepEqual(await page.evaluate(()=>window.__ripple.state.stones),placed);}if(i===0){await page.mouse.click(dailyOpening.view.x+dailyOpening.view.width*dailyOpening.stone.x/128,dailyOpening.view.y+dailyOpening.view.height*dailyOpening.stone.y/128);await page.click('#drop');}else await page.evaluate(()=>window.__ripple.solve());await page.waitForFunction(()=>window.__ripple.state.phase==='complete');if(i===0){assert.equal(await page.evaluate(()=>window.__ripple.state.progress.dailyResults[window.__ripple.state.dailyDay].quick),true);assert.equal(await page.evaluate(()=>window.__ripple.state.progress.tokens),dailyBalance+1);assert.match(await page.locator('#next').innerText(),/Back to your journey/);}if(i<2){assert.equal(await page.locator('#daily-continue').isVisible(),true);await page.click('#daily-continue');await page.waitForFunction(i=>window.__ripple.state.dailyStage===i+1&&window.__ripple.state.phase==='ready',i);}}
 assert.equal(await page.evaluate(()=>window.__ripple.state.progress.tokens),dailyBalance+3);
 await page.click('#copy');assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/^Ripple Daily #.*9\/9 stars/);assert.equal(await page.evaluate(()=>window.__ripple.state.progress.streak),1);checks.push('three-stage UTC daily trail, reload restores mode/stage/stones, streak, clipboard share');
 const replayStars=await page.evaluate(()=>Object.values(window.__ripple.state.progress.stars).reduce((a,b)=>a+b,0)+window.__ripple.state.progress.bonus);await page.click('#replay');await page.waitForFunction(()=>window.__ripple.state.phase==='ready');await page.evaluate(()=>window.__ripple.solve());await page.waitForFunction(()=>window.__ripple.state.phase==='complete');assert.equal(await page.evaluate(()=>Object.values(window.__ripple.state.progress.stars).reduce((a,b)=>a+b,0)+window.__ripple.state.progress.bonus),replayStars);checks.push('replay keeps best stars without farming rewards');
 await page.click('#next');await page.waitForFunction(()=>window.__ripple.state.mode==='campaign');await page.evaluate(()=>window.__ripple.go(3));await page.evaluate(()=>window.__ripple.place([{x:36,y:64,delay:0}]));
 await openJournal();await page.click('#jump-goals');await page.click('#journal-daily');await page.waitForFunction(()=>window.__ripple.state.mode==='daily'&&window.__ripple.state.dailyStage===0&&window.__ripple.state.level?.number===8&&!window.__ripple.state.paused);
 await openJournal();await page.click('#jump-goals');await page.click('#journal-daily');await page.waitForFunction(()=>window.__ripple.state.mode==='campaign'&&window.__ripple.state.level?.number===3&&!window.__ripple.state.paused);assert.deepEqual(await page.evaluate(()=>window.__ripple.state.stones),[{x:36,y:64,delay:0}]);
 checks.push('Replaying a finished daily trail keeps the journey’s unfinished stone placement');
 const sizes=[[907,510],[1216,684],[1077,606],[821,462],[1366,768],[1920,1080],[1536,864],[1280,720],[800,450],[1080,607]];
 for(const [width,height] of sizes){await page.setViewportSize({width,height});await page.evaluate(()=>window.__ripple.go(3));await page.waitForFunction(()=>{const v=window.__ripple.state.view;return Math.abs(v.width-innerWidth*1.08)<1&&Math.abs(v.height-innerHeight*1.08)<1;});if(width<900)await page.screenshot({path:`reports/layout-${width}x${height}.png`});const layout=await page.evaluate(()=>{const r=document.querySelector('#drop').getBoundingClientRect(),v=window.__ripple.state.view;return {overflow:document.documentElement.scrollWidth>innerWidth,dropVisible:r.top>=0&&r.bottom<=innerHeight,dropHeight:r.height,camera:v.x<=0&&v.y<=0&&v.x+v.width>=innerWidth&&v.y+v.height>=innerHeight};});assert.equal(layout.overflow,false);assert.equal(layout.dropVisible,true);assert.ok(layout.dropHeight>=48);assert.ok(layout.camera);}
 checks.push('full-screen lake and 48px Drop control at all 10 CrazyGames desktop sizes');
 await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>{const r=document.getElementById('pond').getBoundingClientRect(),v=window.__ripple.state.view;return r.width===innerWidth&&r.height===innerHeight&&Math.abs(v.width-innerWidth*1.08)<1;});await page.evaluate(()=>window.__ripple.go(1));const edgePoint=await page.evaluate(()=>{const v=window.__ripple.state.view;return {x:v.x+v.width*15/128,y:v.y+v.height*.5};});await page.mouse.click(edgePoint.x,edgePoint.y);assert.equal(await page.evaluate(()=>window.__ripple.state.stones[0].x),15);await page.click('#how-to');await page.click('#dock');assert.ok(await page.locator('#app').evaluate(e=>e.classList.contains('dock-top')));checks.push('placement beyond old square; controls can move to expose covered water');
 const unlocked=await page.evaluate(()=>window.__ripple.state.progress.level);
 await openJournal();await page.click('#continue-journey');
 await page.waitForFunction(n=>window.__ripple.state.level?.number===n&&!window.__ripple.state.paused,unlocked);
 await page.evaluate(()=>window.__ripple.place([{x:15,y:15,delay:0}]));
 await openJournal();await page.click('#continue-journey');
 assert.deepEqual(await page.evaluate(()=>window.__ripple.state.stones),[{x:15,y:15,delay:0}]);
 await page.setViewportSize({width:800,height:450});await openJournal();await page.click('#jump-keepsakes');
 assert.ok(await page.locator('#collection-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));
 await page.screenshot({path:'reports/journal-compact-desktop.png'});await closeJournal();
 assert.equal(await page.evaluate(()=>window.__ripple.state.paused),false);
 await page.setViewportSize({width:1440,height:1000});
 checks.push('journal resumes highest unlocked lake, preserves active placements, and works at 800×450');
 // Same 360 simulation steps at 60 and 144 Hz, independent of render cadence.
 const hashes=await page.evaluate(async()=>{const {Wave}=await import('/src/simulation.js');const w=new Wave([{x:64,y:40,rx:5,ry:10}]);const stones=[{x:36,y:64,delay:0},{x:92,y:64,delay:1}];function run(hz){w.reset(stones);let acc=0;while(w.stepNumber<360){acc+=1/hz;while(acc>=1/60&&w.stepNumber<360){w.step();w.step();acc-=1/60;}}let hash=2166136261;for(const v of new Uint32Array(w.peak.buffer)){hash=Math.imul(hash^v,16777619);}return hash>>>0;}return [run(60),run(144)];});assert.equal(hashes[0],hashes[1]);checks.push('60 / 144 Hz identical peak hash');
 // Exercise the real adapter/main UI against explicit SDK callbacks; no live ad traffic.
 const mock=await context.newPage();mock.on('pageerror',e=>errors.push(e.message));
 await mock.addInitScript(()=>{
   window.sdkCalls=[];let data=JSON.stringify({version:1,level:6,campaign:{number:6}});
   window.CrazyGames={SDK:{environment:'crazygames',init:async()=>{},game:{settings:{muteAudio:true},addSettingsChangeListener:fn=>window.settingsChange=fn,gameplayStart:()=>sdkCalls.push('start'),gameplayStop:()=>sdkCalls.push('stop'),loadingStart(){},loadingStop(){},setGameContext(){},happytime(){},reportGameCompletedPercentage(){}},data:{getItem:()=>{sdkCalls.push('read');return data;},setItem:(k,v)=>{sdkCalls.push('write');data=v;}},ad:{hasAdblock:async()=>false,requestAd:(type,cb)=>{window.adCallbacks=cb;}}}};
 });
 await mock.goto(`${base}/?test`);await mock.waitForFunction(()=>window.__ripple?.state.level.number===6&&window.__ripple.portal.sdk);
 assert.ok(await mock.locator('#sound').isDisabled());
 await mock.click('#pause');await mock.click('#pause-settings');
 assert.ok(await mock.locator('#setting-sound').isDisabled());assert.ok(await mock.locator('#setting-ambience').isDisabled());assert.ok(await mock.locator('#setting-music').isDisabled());
 assert.equal(await mock.locator('#setting-sound-note').isVisible(),true);
 await mock.click('#settings-close');await mock.click('#next');
 await mock.evaluate(()=>window.settingsChange({muteAudio:false}));assert.equal(await mock.locator('#sound').isDisabled(),false);
 assert.ok(await mock.evaluate(()=>sdkCalls.indexOf('read')<sdkCalls.indexOf('write')));assert.equal(await mock.evaluate(()=>window.__ripple.portal.eligible()),false);
 await mock.evaluate(()=>{const p=window.__ripple.portal;p.launchStage='full';p.ads=true;p.boot-=180001;p.ad('rewarded');});assert.ok(await mock.locator('#app').evaluate(e=>e.inert));assert.ok(await mock.evaluate(()=>window.__ripple.state.paused));assert.equal(await mock.evaluate(()=>window.__ripple.sound.paused),false);
 await mock.evaluate(()=>window.adCallbacks.adStarted());assert.equal(await mock.evaluate(()=>window.__ripple.sound.paused),true);
 await mock.evaluate(()=>window.adCallbacks.adError({code:'unfilled'}));assert.equal(await mock.locator('#app').evaluate(e=>e.inert),false);assert.equal(await mock.evaluate(()=>window.__ripple.state.paused),false);
 await mock.evaluate(()=>{window.__ripple.portal.lastAd=-Infinity;window.__ripple.solve();});await mock.waitForFunction(()=>window.__ripple.state.phase==='complete');
 await mock.click('#double');await mock.evaluate(()=>window.adCallbacks.adError({code:'unfilled'}));
 await mock.locator('#reward-toast-title').filter({hasText:'Ad unavailable'}).waitFor();
 assert.equal(await mock.evaluate(()=>Boolean(window.__ripple.state.progress.doubled.l6)),false);
 checks.push('SDK cloud-first restore, portal mute, Basic ad suppression, request/input shield and unfilled recovery');await mock.close();
 const legacyContext=await browser.newContext();await legacyContext.addInitScript(()=>{if(!sessionStorage.getItem('legacy-fixture')){sessionStorage.setItem('legacy-fixture','1');localStorage.setItem('ripple-pond-v1',JSON.stringify({version:1,mode:'campaign',level:11,tutorialDone:true,campaign:{number:11,seed:11*7919,stones:[],attempts:1}}));}});
 const legacyPage=await legacyContext.newPage();await legacyPage.route('https://sdk.crazygames.com/**',r=>r.abort());
 await legacyPage.goto(`${base}/?test`);
 for(let reload=0;reload<2;reload++){if(reload)await legacyPage.reload();await legacyPage.waitForFunction(()=>window.__ripple?.state.level?.number===11);assert.equal(await legacyPage.evaluate(()=>window.__ripple.state.level.par),4);assert.equal(await legacyPage.evaluate(()=>window.__ripple.state.progress.campaign.generatorVersion),1);}
 checks.push('Old in-progress generated puzzle retains its geometry through repeated reloads');await legacyContext.close();
 const oldDailyContext=await browser.newContext();
 await oldDailyContext.addInitScript(()=>{const day=Math.floor(Date.now()/86400000),seed=Math.imul(day,2654435761)>>>0;localStorage.setItem('ripple-pond-v1',JSON.stringify({version:1,mode:'daily',level:4,tutorialDone:true,daily:{number:8,day,stage:0,seed,generatorVersion:2,stones:[],attempts:1}}));});
 const oldDailyPage=await oldDailyContext.newPage();await oldDailyPage.route('https://sdk.crazygames.com/**',r=>r.abort());
 await oldDailyPage.goto(`${base}/?test`);await oldDailyPage.waitForFunction(()=>window.__ripple?.state.mode==='daily'&&window.__ripple.state.level?.number===8);
 assert.deepEqual(await oldDailyPage.evaluate(()=>[window.__ripple.state.level.par,window.__ripple.state.level.rocks.length,window.__ripple.state.progress.daily.generatorVersion]),[3,1,2]);
 checks.push('An unfinished daily puzzle keeps its original geometry after the easier opening is introduced');await oldDailyContext.close();
 assert.ok(sdkBlocked>0);assert.deepEqual(errors,[]);writeFileSync('reports/browser.json',JSON.stringify({passed:true,firstContentfulPaintMs:firstFrame,checks,errors},null,2)+'\n');console.log(checks);
}catch(error){if(page){console.log('FAILURE STATE',JSON.stringify(await page.evaluate(()=>window.__ripple?.state)));await page.screenshot({path:'reports/failure.png'});}writeFileSync('reports/browser.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2)+'\n');throw error;}finally{await browser?.close();server.kill();}
