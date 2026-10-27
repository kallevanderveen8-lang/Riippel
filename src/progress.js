import { C, lakeForLevel } from './config.js';
import { daySeed } from './simulation.js';
import { weeklyScore } from './weekly.js';
export function freshProgress() { return { version: C.version, mode: 'campaign', level: 1, stars: {}, bonus: 0, doubled: {}, chapters: {}, mastery: {}, lakeRewards: {}, discoveries: {}, records: {}, weeklyBest: {}, weeklyRewards: {}, tokens: C.initialTokens, theme: 0, lakeLights: {}, cosmetics: {stones:['river'],lanterns:['bronze'],stone:'river',lantern:'bronze'}, dailyGift:{lastDay:0,streak:0,total:0}, muted: false, tutorialDone: false, preferences: { ambientSound: true, musicEnabled: true, reducedMotion: false, highContrast: false, dockTop: false }, campaign: null, daily: null, weekly: null, dailyTrail: null, dailyResults: {}, streak: 0, lastDaily: 0, goals: { day: daySeed(), solves: [], three: false, clean: false, claimed: [], rerolled: false } }; }
export function parseProgress(raw) {
  try {
    const p = JSON.parse(raw); if (!p || p.version !== C.version) return freshProgress();
    const out = { ...freshProgress(), ...p };
    out.level = Math.max(1, Math.min(10000, Math.floor(Number(out.level) || 1)));
    out.mode = out.mode === 'daily' && out.level > C.dailyUnlock || out.mode === 'weekly' && out.level > C.weeklyUnlock ? out.mode : 'campaign';
    out.theme = Math.max(0, Math.min(C.themes.length - 1, Math.floor(Number(out.theme) || 0)));
    out.tutorialDone = Object.hasOwn(p, 'tutorialDone') ? !!p.tutorialDone : out.level > 1 || !!p.stars?.l1 || !!p.campaign;
    out.preferences = { ambientSound: p.preferences?.ambientSound !== false, musicEnabled: p.preferences?.musicEnabled !== false && (p.preferences?.musicEnabled !== undefined || p.preferences?.ambientSound !== false), reducedMotion: !!p.preferences?.reducedMotion, highContrast: !!p.preferences?.highContrast, dockTop: !!p.preferences?.dockTop };
    out.bonus = Math.max(0, Number(out.bonus) || 0); out.tokens = Math.max(0, Math.min(C.maxTokens, Math.floor(Number(out.tokens) || 0)));
    for (const key of ['stars','doubled','dailyResults','chapters','mastery','lakeRewards','discoveries','records','weeklyBest','weeklyRewards']) if (!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])) out[key] = {};
    out.weeklyBest = Object.fromEntries(Object.entries(out.weeklyBest).filter(([week,best])=>Number.isSafeInteger(Number(week))&&best&&Number.isInteger(best.stars)&&best.stars>=1&&best.stars<=3&&Number.isFinite(best.seconds)&&best.seconds>=0).map(([week,best])=>[week,{stars:best.stars,seconds:best.seconds,score:weeklyScore(best.stars,best.seconds)}]));
    out.weeklyRewards = Object.fromEntries(Object.entries(out.weeklyRewards).filter(([week,value])=>Number.isSafeInteger(Number(week))&&(value===1||value===3)));
    // Old saves earned landscape choices by stars. Keep their progress, but the
    // location now follows the level; only lighting and owned cosmetics are chosen.
    out.lakeLights = Object.fromEntries(Object.entries(p.lakeLights || {}).filter(([key,value])=>/^\d{1,4}$/.test(key)&&(value==='day'||value==='night')));
    if (!p.lakeLights && p.theme === 3) out.lakeLights[0] = 'night';
    const owned = (kind,defaultId) => [...new Set([defaultId,...(Array.isArray(p.cosmetics?.[kind])?p.cosmetics[kind]:[]).filter(id=>C.cosmetics[kind].some(item=>item.id===id))])];
    const stones = owned('stones','river'), lanterns = owned('lanterns','bronze');
    out.cosmetics = {stones,lanterns,stone:stones.includes(p.cosmetics?.stone)?p.cosmetics.stone:'river',lantern:lanterns.includes(p.cosmetics?.lantern)?p.cosmetics.lantern:'bronze'};
    out.dailyGift = {lastDay:Math.max(0,Math.floor(Number(p.dailyGift?.lastDay)||0)),streak:Math.max(0,Math.floor(Number(p.dailyGift?.streak)||0)),total:Math.max(0,Math.floor(Number(p.dailyGift?.total)||0))};
    if (!p.lakeRewards) for(let group=0;group<Math.floor((out.level-1)/C.lakeLength);group++) if(Array.from({length:C.lakeLength},(_,i)=>out.stars[`l${group*C.lakeLength+i+1}`]).every(Boolean)) {
      out.lakeRewards[group]=true;
      out.tokens=Math.min(C.maxTokens,out.tokens+C.lakeCompletionCoins);
    }
    if (!out.dailyTrail || !Array.isArray(out.dailyTrail.results)) out.dailyTrail = null;
    else { out.dailyTrail.stage = Math.max(0, Math.min(C.dailyLength - 1, Math.floor(Number(out.dailyTrail.stage) || 0))); out.dailyTrail.results = out.dailyTrail.results.slice(0,C.dailyLength); }
    if (!out.goals || !Array.isArray(out.goals.solves) || !Array.isArray(out.goals.claimed)) out.goals = freshProgress().goals;
    rollDay(out); return out;
  } catch { return freshProgress(); }
}
export function rollDay(p, day = daySeed()) { if (p.goals.day !== day) p.goals = { day, solves: [], three: false, clean: false, claimed: [], rerolled: false }; }
export function totalStars(p) { return Object.values(p.stars).reduce((sum, v) => sum + Math.max(0, Math.min(3, Number(v) || 0)), 0) + p.bonus; }
export function goals(p) {
  const g = p.goals;
  return [ { title: g.rerolled ? 'Solve 2 different lakes' : 'Solve 5 different lakes', value: g.solves.length, target: g.rerolled ? 2 : C.goalSolves }, { title: 'Earn three stars', value: +g.three, target: 1 }, { title: 'Solve without reset', value: +g.clean, target: 1 } ];
}
export function chapter(number) {
  const index = Math.floor((number - 1) / C.chapterLength);
  return { index, first: index * C.chapterLength + 1, name: C.chapters[index % C.chapters.length] };
}
export function chapterProgress(p, number) {
  const ch = chapter(number), scores = Array.from({length:C.chapterLength}, (_,i) => Math.max(0, Math.min(3, Number(p.stars[`l${ch.first + i}`]) || 0)));
  return { ...ch, solved: scores.filter(Boolean).length, stars: scores.reduce((a,b) => a+b,0), mastered: scores.every(s => s === 3) };
}
export function masteryTarget(p, number) {
  const ch=chapter(number);
  const candidates=Array.from({length:C.chapterLength},(_,i)=>ch.first+i)
    .map(n=>({number:n,stars:Number(p.stars[`l${n}`])||0}))
    .filter(l=>l.number<=p.level&&l.stars>0&&l.stars<3)
    .sort((a,b)=>b.stars-a.stars||a.number-b.number);
  return candidates[0]||null;
}
export function discoveries(p) {
  const campaign = Object.entries(p.stars).filter(([key,value]) => /^l\d+$/.test(key) && value > 0);
  const trails = Object.values(p.dailyResults).filter(r => r?.trail).length;
  const quickVisits = Object.values(p.dailyResults).filter(r => r?.quick || r?.trail).length;
  const perfect = campaign.filter(([,value]) => value === 3).length;
  const gifts = p.dailyGift?.total || 0, stars = totalStars(p);
  return [
    ...Array.from({length:12},(_,group)=>({ id:`postcard-${group}`, name:`${lakeForLevel(group*C.lakeLength+1).name} postcard`, detail:`Complete levels ${group*C.lakeLength+1}–${(group+1)*C.lakeLength}`, value:campaign.filter(([key])=>{const n=Number(key.slice(1));return n>group*C.lakeLength&&n<=(group+1)*C.lakeLength;}).length, target:C.lakeLength, reward:2, postcard:group })),
    { id:'three-daily-visits', name:'By the water', detail:'Finish a daily puzzle on 3 days', value:quickVisits, target:3, reward:2 },
    { id:'seven-daily-visits', name:'A daily pause', detail:'Finish a daily puzzle on 7 days', value:quickVisits, target:7, reward:3 },
    { id:'fourteen-daily-visits', name:'A familiar ripple', detail:'Finish a daily puzzle on 14 days', value:quickVisits, target:14, reward:4 },
    { id:'first-chapter', name:'First light', detail:'Complete 5 journey lakes', value:campaign.length, target:5, reward:2 },
    { id:'ten-lakes', name:'Echo explorer', detail:'Complete 10 journey lakes', value:campaign.length, target:10, reward:2 },
    { id:'ten-perfect', name:'A careful hand', detail:'Earn 3 stars on 10 journey lakes', value:perfect, target:10, reward:3 },
    { id:'three-trails', name:'A familiar shore', detail:'Finish daily trails on 3 different days', value:trails, target:3, reward:3 },
    { id:'thirty-lakes', name:'Far shores', detail:'Complete 30 journey lakes', value:campaign.length, target:30, reward:3 },
    { id:'seven-trails', name:'A lakeside ritual', detail:'Finish daily trails on 7 different days', value:trails, target:7, reward:4 },
    { id:'three-perfect', name:'Three bright lights', detail:'Earn 3 stars on 3 lakes', value:perfect, target:3, reward:2 },
    { id:'twenty-lakes', name:'Across the water', detail:'Complete 20 journey lakes', value:campaign.length, target:20, reward:3 },
    { id:'forty-lakes', name:'New currents', detail:'Complete 40 journey lakes', value:campaign.length, target:40, reward:4 },
    { id:'sixty-lakes', name:'Six shores', detail:'Complete 60 journey lakes', value:campaign.length, target:60, reward:5 },
    { id:'eighty-lakes', name:'Further still', detail:'Complete 80 journey lakes', value:campaign.length, target:80, reward:6 },
    { id:'hundred-lakes', name:'The long way home', detail:'Complete 100 journey lakes', value:campaign.length, target:100, reward:8 },
    { id:'twenty-five-perfect', name:'A steady hand', detail:'Earn 3 stars on 25 lakes', value:perfect, target:25, reward:5 },
    { id:'fifty-perfect', name:'Every ripple counts', detail:'Earn 3 stars on 50 lakes', value:perfect, target:50, reward:7 },
    { id:'sixty-perfect', name:'Six still shores', detail:'Earn 3 stars on 60 journey levels', value:perfect, target:60, reward:6 },
    { id:'hundred-perfect', name:'An unbroken reflection', detail:'Earn 3 stars on 100 journey levels', value:perfect, target:100, reward:8 },
    { id:'all-perfect', name:'Every shore in harmony', detail:'Earn 3 stars on all 120 featured levels', value:perfect, target:120, reward:12 },
    { id:'first-trail', name:'A day by the water', detail:'Finish 1 daily trail', value:trails, target:1, reward:2 },
    { id:'fourteen-trails', name:'Two weeks of lakes', detail:'Finish daily trails on 14 days', value:trails, target:14, reward:6 },
    { id:'thirty-trails', name:'A month of lakes', detail:'Finish daily trails on 30 days', value:trails, target:30, reward:8 },
    { id:'seven-gifts', name:'A week of visits', detail:'Claim 7 daily rewards', value:gifts, target:7, reward:4 },
    { id:'twenty-eight-gifts', name:'A familiar place', detail:'Claim 28 daily rewards', value:gifts, target:28, reward:8 },
    { id:'fifty-stars', name:'Golden water', detail:'Collect 50 stars', value:stars, target:50, reward:3 },
    { id:'hundred-fifty-stars', name:'All the light', detail:'Collect 150 stars', value:stars, target:150, reward:6 },
  ].map(d => ({...d, earned:!!p.discoveries[d.id], ready:d.value>=d.target&&!p.discoveries[d.id]}));
}
export function readyDiscoveries(p) { return discoveries(p).filter(d=>d.ready).map(({id,name,reward})=>({id,name,reward})); }
export function claimDiscovery(p, id) {
  const discovery = discoveries(p).find(d=>d.id===id && d.ready);
  if (!discovery) return null;
  p.discoveries[id] = true;
  p.tokens = Math.min(C.maxTokens,p.tokens+discovery.reward);
  return {id,name:discovery.name,reward:discovery.reward};
}
export function spend(p, cost) { if (p.tokens < cost) return false; p.tokens -= cost; return true; }
export function lightForLake(p, number) {
  const lake=lakeForLevel(number);
  return p.lakeLights?.[lake.group] || (lake.themeIndex===3?'night':'day');
}
export function setLakeLight(p, number, light) {
  if (!Number.isSafeInteger(number) || number<1 || lakeForLevel(number).first>p.level || !['day','night'].includes(light)) return false;
  p.lakeLights[lakeForLevel(number).group]=light;
  return true;
}
export function claimDailyGift(p, day = daySeed()) {
  if (!Number.isSafeInteger(day) || day<1 || p.dailyGift.lastDay>=day) return null;
  const streak = p.dailyGift.lastDay===day-1 ? p.dailyGift.streak+1 : 1;
  const reward=C.dailyGiftCoins[(streak-1)%C.dailyGiftCoins.length];
  p.dailyGift={lastDay:day,streak,total:p.dailyGift.total+1};
  p.tokens=Math.min(C.maxTokens,p.tokens+reward);
  return {streak,reward};
}
export function buyCosmetic(p,kind,id) {
  const catalog=C.cosmetics[kind];
  const item=catalog?.find(entry=>entry.id===id);
  if (!item || cosmeticLock(p,item) || p.cosmetics[kind].includes(id) || !spend(p,item.cost)) return false;
  p.cosmetics[kind].push(id);
  p.cosmetics[kind==='stones'?'stone':'lantern']=id;
  return true;
}
export function cosmeticLock(p,item) {
  if (p.level < (item.unlockLevel || 1)) return `Level ${item.unlockLevel}`;
  if (item.perfectThrough && !Array.from({length:item.perfectThrough},(_,i)=>p.stars[`l${i+1}`]===3).every(Boolean)) return `3★ on levels 1–${item.perfectThrough}`;
  return null;
}
export function equipCosmetic(p,kind,id) {
  if (!C.cosmetics[kind]?.some(item=>item.id===id) || !p.cosmetics[kind].includes(id)) return false;
  p.cosmetics[kind==='stones'?'stone':'lantern']=id;
  return true;
}
export function buyNextLake(p, number) {
  if (!Number.isSafeInteger(number) || number !== p.level + 1 || p.level < 2 || !spend(p,C.lakeSkipCost)) return false;
  p.level = number;
  return true;
}
export function complete(p, key, stones, par, resetUsed, stats = {}) {
  rollDay(p); const stars = stones <= par ? 3 : stones === par + 1 ? 2 : 1;
  const before = totalStars(p), first = !p.stars[key], old = p.records[key]; p.stars[key] = Math.max(p.stars[key] || 0, stars);
  const newRecord = !old || stones < old.stones || (stones === old.stones && stats.attempts < old.attempts);
  if (newRecord) p.records[key] = { stones, attempts: stats.attempts || 1, seconds: Math.round(stats.elapsed || 0) };
  // Journey clears fund the shop; the daily puzzle has its own once-per-day coin.
  if (first && key.startsWith('l')) p.tokens = Math.min(C.maxTokens, p.tokens + 1);
  if (!p.goals.solves.includes(key)) p.goals.solves.push(key);
  if (stars === 3) p.goals.three = true; if (!resetUsed) p.goals.clean = true;
  let goalBonus = 0;
  goals(p).forEach((g,i) => { if (g.value >= g.target && !p.goals.claimed.includes(i)) { p.goals.claimed.push(i); p.bonus += C.goalReward; goalBonus += C.goalReward; } });
  let chapterReward = false, masteryReward = false, lakeReward = false, newLake = null;
  if (key.startsWith('l')) {
    const number=Number(key.slice(1)), ch = chapter(number), lake=lakeForLevel(number);
    if (!p.chapters[ch.index] && Array.from({length:C.chapterLength}, (_,i) => p.stars[`l${ch.first + i}`]).every(Boolean)) {
      p.chapters[ch.index] = true; p.bonus += C.chapterBonus; p.tokens = Math.min(C.maxTokens, p.tokens + C.chapterTokens); chapterReward = true;
    }
    if (!p.mastery[ch.index] && chapterProgress(p, Number(key.slice(1))).mastered) {
      p.mastery[ch.index] = true; p.tokens = Math.min(C.maxTokens, p.tokens + C.masteryTokens); masteryReward = true;
    }
    if (!p.lakeRewards[lake.group] && Array.from({length:C.lakeLength},(_,i)=>p.stars[`l${lake.first+i}`]).every(Boolean)) {
      p.lakeRewards[lake.group]=true;p.tokens=Math.min(C.maxTokens,p.tokens+C.lakeCompletionCoins);lakeReward=true;
    }
    if (first && number===lake.last && p.level<=number) newLake=lakeForLevel(number+1).name;
  }
  // Keep detailed records bounded; best stars and chapter unlocks are retained.
  const keys = Object.keys(p.records); for (const key of keys.slice(0, Math.max(0, keys.length - C.recordLimit))) delete p.records[key];
  return { stars, gained: totalStars(p) - before, better: stones < par, newRecord, first, chapterReward, masteryReward, lakeReward, newLake, goalBonus, discoveries:readyDiscoveries(p) };
}
export function dailyRun(p, day = daySeed()) {
  if (p.dailyTrail?.day !== day) p.dailyTrail = { day, stage: 0, results: [] };
  return p.dailyTrail;
}
export function finishDaily(p, day, stage, result, stones) {
  const run = dailyRun(p, day);
  if (!run.results[stage] || result.stars > run.results[stage].stars) run.results[stage] = { stars: result.stars, stones };
  run.stage = Math.max(run.stage, Math.min(C.dailyLength - 1, stage + 1));
  if (stage === 0 && !p.dailyResults[day]?.quick && !p.dailyResults[day]?.trail) {
    p.dailyResults[day] = { ...p.dailyResults[day], quick:true };
    p.tokens = Math.min(C.maxTokens,p.tokens+1);
  }
  if (run.results.filter(Boolean).length !== C.dailyLength) return null;
  const record = { stars: run.results.reduce((n,r) => n + r.stars, 0), stones: run.results.reduce((n,r) => n + r.stones, 0) };
  if (!p.dailyResults[day]?.trail) {
    // Existing single-lake saves keep their streak, without counting today twice.
    if (p.lastDaily !== day) { p.streak = p.lastDaily === day - 1 ? p.streak + 1 : 1; p.lastDaily = day; }
    p.tokens = Math.min(C.maxTokens, p.tokens + C.dailyTokens);
  }
  p.dailyResults[day] = { ...record, quick:true, trail: true };
  result.discoveries = [...new Map([...(result.discoveries || []),...readyDiscoveries(p)].map(d=>[d.id,d])).values()];
  return record;
}
