import test from 'node:test';import assert from 'node:assert/strict';import {freshProgress,parseProgress,complete,totalStars,rollDay,goals,finishDaily,dailyRun,spend,buyNextLake,chapterProgress,masteryTarget,discoveries,readyDiscoveries,claimDiscovery,claimDailyGift,buyCosmetic,equipCosmetic,lightForLake,setLakeLight} from '../src/progress.js';import {C,lakeForLevel} from '../src/config.js';
test('coins can unlock only the next lake, once, after the first solve',()=>{
 const p=freshProgress(), original=p.tokens;
 assert.equal(buyNextLake(p,2),false);assert.equal(p.tokens,original);
 complete(p,'l1',1,1,false);p.level=2;
 assert.equal(buyNextLake(p,4),false);
 assert.equal(buyNextLake(p,3),true);assert.equal(p.level,3);assert.equal(p.tokens,original+1-C.lakeSkipCost);
 assert.equal(buyNextLake(p,3),false);
 const saved=parseProgress(JSON.stringify(p));assert.equal(saved.level,3);assert.equal(saved.tokens,p.tokens);
 assert.equal(buyNextLake(saved,4),false);
});
test('star improvement and goals cannot be farmed by replay',()=>{const p=freshProgress();let r=complete(p,'l1',1,1,false);assert.equal(r.stars,3);assert.equal(totalStars(p),7);complete(p,'l1',1,1,false);assert.equal(totalStars(p),7);complete(p,'l2',4,2,true);assert.equal(p.stars.l2,1);complete(p,'l2',2,2,true);assert.equal(p.stars.l2,3);assert.equal(totalStars(p),10);});
test('daily streak requires all three lakes, survives resume, pays once, resets after gap',()=>{const p=freshProgress();function run(day){for(let i=0;i<3;i++)finishDaily(p,day,i,{stars:3},4);}finishDaily(p,10,0,{stars:3},4);assert.equal(p.streak,0);assert.equal(dailyRun(parseProgress(JSON.stringify(p)),10).stage,1);run(10);assert.equal(p.streak,1);const tokens=p.tokens;run(10);assert.equal(p.tokens,tokens);run(11);assert.equal(p.streak,2);run(13);assert.equal(p.streak,1);assert.deepEqual(p.dailyResults[13],{stars:9,stones:12,trail:true});});
test('chapters reward new completions once and milestones wait to be claimed',()=>{const p=freshProgress();for(let n=1;n<=5;n++)complete(p,`l${n}`,2,2,false,{attempts:4});assert.equal(p.tokens,C.initialTokens+5+C.chapterTokens+C.masteryTokens);assert.equal(readyDiscoveries(p).some(d=>d.id==='first-chapter'),true);assert.equal(p.chapters[0],true);const bonus=p.bonus;const r=complete(p,'l5',1,2,false,{attempts:2});assert.equal(r.newRecord,true);assert.equal(p.records.l5.stones,1);assert.equal(p.bonus,bonus);assert.equal(spend(p,1),true);p.tokens=0;assert.equal(spend(p,1),false);assert.equal(p.tokens,0);});
test('old and corrupt saves recover, UTC rollover resets goals only',()=>{assert.equal(parseProgress('no json').level,1);const p=freshProgress();p.level=8;p.stars.l1=3;rollDay(p,p.goals.day+1);assert.equal(p.level,8);assert.equal(totalStars(p),3);assert.equal(goals(p)[0].value,0);const old=parseProgress('{"version":1,"level":-3}');assert.equal(old.level,1);assert.equal(old.tokens,C.initialTokens);});
test('first-run guidance and menu preferences survive saves without interrupting existing players',()=>{
 const fresh=parseProgress(JSON.stringify(freshProgress()));assert.equal(fresh.tutorialDone,false);
 const returning=parseProgress(JSON.stringify({version:C.version,level:1,campaign:{number:1,stones:[{x:64,y:64}]}}));assert.equal(returning.tutorialDone,true);
 const saved=freshProgress();saved.tutorialDone=true;saved.preferences={ambientSound:false,reducedMotion:true,highContrast:true,dockTop:true};
 assert.deepEqual(parseProgress(JSON.stringify(saved)).preferences,saved.preferences);
 assert.deepEqual(parseProgress(JSON.stringify({...saved,preferences:{reducedMotion:1,dockTop:null}})).preferences,{ambientSound:true,reducedMotion:true,highContrast:false,dockTop:false});
});

test('active daily mode survives saves without unlocking it early',()=>{const p=freshProgress();p.level=4;p.mode='daily';assert.equal(parseProgress(JSON.stringify(p)).mode,'daily');p.level=1;assert.equal(parseProgress(JSON.stringify(p)).mode,'campaign');});
test('chapter mastery rewards improving old lakes and cannot be farmed after reload',()=>{
 let p=freshProgress();for(let n=1;n<=5;n++)complete(p,`l${n}`,3,2,false);
 assert.equal(chapterProgress(p,1).stars,10);assert.equal(p.mastery[0],undefined);
 for(let n=1;n<=4;n++)complete(p,`l${n}`,2,2,false);
 const before=p.tokens,r=complete(p,'l5',2,2,false);assert.equal(r.masteryReward,true);assert.equal(p.tokens,before+C.masteryTokens);
 p=parseProgress(JSON.stringify(p));const saved=p.tokens;assert.equal(complete(p,'l5',1,2,false).masteryReward,false);assert.equal(p.tokens,saved);assert.equal(chapterProgress(p,1).mastered,true);
});
test('milestones count distinct days without requiring a streak',()=>{
 let p=freshProgress();for(const day of [10,13,20])for(let stage=0;stage<3;stage++)finishDaily(p,day,stage,{stars:3},3);
 assert.equal(p.streak,1);assert.equal(p.discoveries['three-trails'],undefined);assert.equal(readyDiscoveries(p).some(d=>d.id==='three-trails'),true);assert.equal(p.tokens,C.initialTokens+3*C.dailyTokens);
 p=parseProgress(JSON.stringify(p));const before=p.tokens;for(let stage=0;stage<3;stage++)finishDaily(p,20,stage,{stars:3},3);
 assert.equal(p.tokens,before);assert.equal(discoveries(p).find(d=>d.id==='three-trails').value,3);
});
test('legacy saves retain stars and gain missing journal fields; discoveries pay once',()=>{
 const old={version:1,level:6,stars:{l1:3,l2:3,l3:3,l4:3,l5:3},tokens:4,theme:3};const p=parseProgress(JSON.stringify(old));
 assert.equal(p.level,6);assert.equal(p.theme,3);assert.deepEqual(p.mastery,{});assert.equal(claimDiscovery(p,'first-chapter').reward,2);assert.equal(p.tokens,6);
 assert.equal(claimDiscovery(p,'first-chapter'),null);assert.equal(p.tokens,6);
});
test('completed lakes in older saves receive their new one-time coin reward',()=>{
 const old={version:1,level:11,stars:Object.fromEntries(Array.from({length:10},(_,i)=>[`l${i+1}`,3])),tokens:5};
 const migrated=parseProgress(JSON.stringify(old));assert.equal(migrated.tokens,9);assert.equal(migrated.lakeRewards[0],true);
 assert.equal(parseProgress(JSON.stringify(migrated)).tokens,9);
 assert.equal(complete(migrated,'l10',3,3,false).lakeReward,false);
});
test('daily stars never count as journey mastery and journal rewards respect the hint cap',()=>{
 const p=freshProgress();for(let n=0;n<12;n++)p.stars[`d200-${n}`]=3;
 assert.equal(discoveries(p).find(d=>d.id==='ten-perfect').value,0);
 p.tokens=C.maxTokens-1;for(let n=1;n<=10;n++)p.stars[`l${n}`]=3;
 const ready=readyDiscoveries(p);assert.ok(ready.length>=3);for(const d of ready)claimDiscovery(p,d.id);assert.equal(p.tokens,C.maxTokens);assert.deepEqual(readyDiscoveries(p),[]);
});
test('ten levels make one lake and opening the next lake is announced once',()=>{
 const p=freshProgress();const first=complete(p,'l1',1,1,false);assert.equal(first.goalBonus,4);assert.equal(first.gained,7);
 for(let n=2;n<10;n++)complete(p,`l${n}`,2,2,false);
 const last=complete(p,'l10',2,2,false);assert.equal(last.newLake,'Evening light');assert.equal(last.lakeReward,true);
 const coins=p.tokens;const replay=complete(p,'l10',2,2,false);assert.equal(replay.lakeReward,false);assert.equal(replay.newLake,null);assert.equal(p.tokens,coins);
 assert.equal(lakeForLevel(10).group,0);assert.equal(lakeForLevel(11).group,1);assert.equal(lakeForLevel(121).group,12);
});
test('day and night are stored per lake and cosmetic purchases persist',()=>{
 const p=freshProgress();p.level=25;
 assert.equal(setLakeLight(p,11,'night'),true);assert.equal(lightForLake(p,19),'night');assert.equal(lightForLake(p,1),'day');
 assert.equal(setLakeLight(p,31,'night'),false);
 p.tokens=40;assert.equal(buyCosmetic(p,'stones','frog'),true);assert.equal(p.tokens,25);assert.equal(buyCosmetic(p,'stones','frog'),false);
 assert.equal(buyCosmetic(p,'lanterns','reed'),true);assert.equal(equipCosmetic(p,'stones','river'),true);
 const saved=parseProgress(JSON.stringify(p));assert.equal(saved.cosmetics.stone,'river');assert.ok(saved.cosmetics.stones.includes('frog'));assert.equal(saved.cosmetics.lantern,'reed');assert.equal(lightForLake(saved,11),'night');
});
test('daily visit rewards grow, reset after missed day, and claim once',()=>{
 const p=freshProgress();const first=claimDailyGift(p,100);assert.deepEqual(first,{streak:1,reward:2});assert.equal(claimDailyGift(p,100),null);
 assert.equal(claimDailyGift(p,101).reward,3);assert.equal(claimDailyGift(p,103).streak,1);
 const saved=parseProgress(JSON.stringify(p));assert.equal(saved.dailyGift.total,3);assert.equal(claimDailyGift(saved,103),null);
});
test('mastery suggests a completed lake closest to three stars and never opens locked lakes',()=>{
 const p=freshProgress();p.level=4;p.stars={l1:1,l2:2,l3:3,l5:2,'d200-0':2};
 assert.deepEqual(masteryTarget(p,1),{number:2,stars:2});
 p.stars.l2=3;assert.deepEqual(masteryTarget(p,1),{number:1,stars:1});
 p.stars.l1=3;assert.equal(masteryTarget(p,1),null);
});
test('mastery suggestions stay within the browsed chapter and do not mutate saves',()=>{
 const p=freshProgress();p.level=11;p.stars={l1:2,l6:1,l7:2,l8:2};const before=JSON.stringify(p);
 assert.deepEqual(masteryTarget(p,6),{number:7,stars:2});assert.equal(masteryTarget(p,11),null);assert.equal(JSON.stringify(p),before);
 assert.deepEqual(masteryTarget(parseProgress(before),6),{number:7,stars:2});
});
