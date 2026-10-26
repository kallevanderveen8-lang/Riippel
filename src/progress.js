import { C } from './config.js';
import { daySeed } from './simulation.js';
export function freshProgress() { return { version: C.version, mode: 'campaign', level: 1, stars: {}, bonus: 0, doubled: {}, chapters: {}, mastery: {}, discoveries: {}, records: {}, tokens: C.initialTokens, theme: 0, muted: false, tutorialDone: false, preferences: { ambientSound: true, reducedMotion: false, highContrast: false, dockTop: false }, campaign: null, daily: null, dailyTrail: null, dailyResults: {}, streak: 0, lastDaily: 0, goals: { day: daySeed(), solves: [], three: false, clean: false, claimed: [], rerolled: false } }; }
export function parseProgress(raw) {
  try {
    const p = JSON.parse(raw); if (!p || p.version !== C.version) return freshProgress();
    const out = { ...freshProgress(), ...p };
    out.level = Math.max(1, Math.min(10000, Math.floor(Number(out.level) || 1)));
    out.mode = out.mode === 'daily' && out.level > C.dailyUnlock ? 'daily' : 'campaign';
    out.theme = Math.max(0, Math.min(C.themes.length - 1, Math.floor(Number(out.theme) || 0)));
    out.tutorialDone = Object.hasOwn(p, 'tutorialDone') ? !!p.tutorialDone : out.level > 1 || !!p.stars?.l1 || !!p.campaign;
    out.preferences = { ambientSound: p.preferences?.ambientSound !== false, reducedMotion: !!p.preferences?.reducedMotion, highContrast: !!p.preferences?.highContrast, dockTop: !!p.preferences?.dockTop };
    out.bonus = Math.max(0, Number(out.bonus) || 0); out.tokens = Math.max(0, Math.min(C.maxTokens, Math.floor(Number(out.tokens) || 0)));
    for (const key of ['stars','doubled','dailyResults','chapters','mastery','discoveries','records']) if (!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])) out[key] = {};
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
  const perfect = campaign.filter(([,value]) => value === 3).length;
  return [
    { id:'first-chapter', name:'First light', detail:'Complete 5 journey lakes', value:campaign.length, target:5, reward:2 },
    { id:'ten-lakes', name:'Echo explorer', detail:'Complete 10 journey lakes', value:campaign.length, target:10, reward:2 },
    { id:'ten-perfect', name:'A careful hand', detail:'Earn 3 stars on 10 journey lakes', value:perfect, target:10, reward:3 },
    { id:'three-trails', name:'A familiar shore', detail:'Finish daily trails on 3 different days', value:trails, target:3, reward:3 },
    { id:'thirty-lakes', name:'Far shores', detail:'Complete 30 journey lakes', value:campaign.length, target:30, reward:3 },
    { id:'seven-trails', name:'A lakeside ritual', detail:'Finish daily trails on 7 different days', value:trails, target:7, reward:4 },
  ].map(d => ({...d, earned:!!p.discoveries[d.id]}));
}
export function awardDiscoveries(p) {
  const earned = discoveries(p).filter(d => !d.earned && d.value >= d.target);
  for (const d of earned) { p.discoveries[d.id] = true; p.tokens = Math.min(C.maxTokens, p.tokens + d.reward); }
  return earned.map(({id,name,reward}) => ({id,name,reward}));
}
export function spend(p, cost) { if (p.tokens < cost) return false; p.tokens -= cost; return true; }
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
  if (first) p.tokens = Math.min(C.maxTokens, p.tokens + 1);
  if (!p.goals.solves.includes(key)) p.goals.solves.push(key);
  if (stars === 3) p.goals.three = true; if (!resetUsed) p.goals.clean = true;
  let goalBonus = 0;
  goals(p).forEach((g,i) => { if (g.value >= g.target && !p.goals.claimed.includes(i)) { p.goals.claimed.push(i); p.bonus += C.goalReward; goalBonus += C.goalReward; } });
  let chapterReward = false, masteryReward = false;
  if (key.startsWith('l')) {
    const ch = chapter(Number(key.slice(1)));
    if (!p.chapters[ch.index] && Array.from({length:C.chapterLength}, (_,i) => p.stars[`l${ch.first + i}`]).every(Boolean)) {
      p.chapters[ch.index] = true; p.bonus += C.chapterBonus; p.tokens = Math.min(C.maxTokens, p.tokens + C.chapterTokens); chapterReward = true;
    }
    if (!p.mastery[ch.index] && chapterProgress(p, Number(key.slice(1))).mastered) {
      p.mastery[ch.index] = true; p.tokens = Math.min(C.maxTokens, p.tokens + C.masteryTokens); masteryReward = true;
    }
  }
  // Keep detailed records bounded; best stars and chapter unlocks are retained.
  const keys = Object.keys(p.records); for (const key of keys.slice(0, Math.max(0, keys.length - C.recordLimit))) delete p.records[key];
  return { stars, gained: totalStars(p) - before, better: stones < par, newRecord, first, chapterReward, masteryReward, goalBonus, themesUnlocked:C.themes.filter(t=>t.unlock>before&&t.unlock<=totalStars(p)).map(t=>t.name), discoveries:awardDiscoveries(p) };
}
export function dailyRun(p, day = daySeed()) {
  if (p.dailyTrail?.day !== day) p.dailyTrail = { day, stage: 0, results: [] };
  return p.dailyTrail;
}
export function finishDaily(p, day, stage, result, stones) {
  const run = dailyRun(p, day);
  if (!run.results[stage] || result.stars > run.results[stage].stars) run.results[stage] = { stars: result.stars, stones };
  run.stage = Math.max(run.stage, Math.min(C.dailyLength - 1, stage + 1));
  if (run.results.filter(Boolean).length !== C.dailyLength) return null;
  const record = { stars: run.results.reduce((n,r) => n + r.stars, 0), stones: run.results.reduce((n,r) => n + r.stones, 0) };
  if (!p.dailyResults[day]?.trail) {
    // Existing single-lake saves keep their streak, without counting today twice.
    if (p.lastDaily !== day) { p.streak = p.lastDaily === day - 1 ? p.streak + 1 : 1; p.lastDaily = day; }
    p.tokens = Math.min(C.maxTokens, p.tokens + C.dailyTokens);
  }
  p.dailyResults[day] = { ...record, trail: true };
  result.discoveries = [...(result.discoveries || []), ...awardDiscoveries(p)];
  return record;
}
