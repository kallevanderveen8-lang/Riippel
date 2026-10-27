import test from 'node:test';
import assert from 'node:assert/strict';
import { C } from '../src/config.js';
import { freshProgress, parseProgress, buyCosmetic, cosmeticLock, readyDiscoveries, claimDiscovery } from '../src/progress.js';
import { weeklyId, weeklySeed, weeklyStart, weeklyStars, weeklyScore, weeklyTime, recordWeekly, encryptScore } from '../src/weekly.js';
import { Portal } from '../src/sdk.js';

test('the weekly puzzle changes with the CrazyGames Monday 09:00 UTC season',()=>{
 const before=Date.UTC(2026,9,26,8,59,59), after=Date.UTC(2026,9,26,9);
 assert.equal(weeklyId(after),weeklyId(before)+1);
 assert.equal(weeklyStart(weeklyId(after)),after);
 assert.notEqual(weeklySeed(weeklyId(before)),weeklySeed(weeklyId(after)));
 assert.equal(weeklyId(after+6*86400000),weeklyId(after));
});
test('all three-star clears beat two-star clears, and equal stars favor speed',()=>{
 assert.equal(weeklyStars(3,3),3);assert.equal(weeklyStars(4,3),2);assert.equal(weeklyStars(5,3),1);
 assert.ok(weeklyScore(3,999999)>weeklyScore(2,0));
 assert.ok(weeklyScore(2,31.24)>weeklyScore(2,31.25));
 assert.equal(weeklyTime(92.35),'1:32.35');
 const p=freshProgress(), week=weeklyId();
 assert.equal(recordWeekly(p,week,2,20).improved,true);
 assert.equal(recordWeekly(p,week,2,30).improved,false);
 assert.equal(recordWeekly(p,week,3,500).improved,true);
 assert.equal(parseProgress(JSON.stringify(p)).weeklyBest[week].stars,3);
});
test('rare items require both level progress and all specified three-star levels',()=>{
 const p=freshProgress();p.level=121;p.tokens=900;
 const opal=C.cosmetics.stones.find(item=>item.id==='opal');
 const voidStone=C.cosmetics.stones.find(item=>item.id==='void');
 assert.equal(cosmeticLock(p,opal),'3★ on levels 1–30');
 for(let n=1;n<=120;n++)p.stars[`l${n}`]=3;
 p.stars.l17=2;
 assert.equal(buyCosmetic(p,'stones','opal'),false);
 p.stars.l17=3;
 assert.equal(cosmeticLock(p,voidStone),null);
 assert.equal(buyCosmetic(p,'stones','void'),true);
 assert.equal(p.tokens,500);
 assert.equal(readyDiscoveries(p).some(item=>item.id==='all-perfect'),true);
 assert.equal(claimDiscovery(p,'all-perfect').reward,12);
 assert.equal(claimDiscovery(p,'all-perfect'),null);
});
test('SDK payload encrypts the actual score with AES-GCM and stays disabled until configured',async()=>{
 const key=Buffer.alloc(32,7).toString('base64'), score=weeklyScore(3,12.34);
 const encrypted=await encryptScore(score,key);
 const bytes=Buffer.from(encrypted,'base64');
 const cryptoKey=await crypto.subtle.importKey('raw',Buffer.alloc(32,7),'AES-GCM',false,['decrypt']);
 assert.equal(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.subarray(0,12)},cryptoKey,bytes.subarray(12))),String(score));
 const portal=new Portal();let submitted;
 portal.sdk={user:{submitScore:payload=>{submitted=payload;}}};
 assert.equal(await portal.submitWeeklyScore(score),false);
 const settings=C.weeklyLeaderboard;settings.enabled=true;settings.encryptionKey=key;
 try { assert.equal(await portal.submitWeeklyScore(score),true);assert.equal(submitted.score,score);assert.ok(submitted.encryptedScore); }
 finally { settings.enabled=false;settings.encryptionKey=''; }
});
