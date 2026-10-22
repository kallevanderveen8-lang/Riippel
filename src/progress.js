import { C } from './config.js';
import { daySeed } from './simulation.js';
export function freshProgress() { return { version: C.version, level: 1, stars: {}, bonus: 0, doubled: {}, chapters: {}, records: {}, tokens: C.initialTokens, theme: 0, muted: false, campaign: null, daily: null, dailyTrail: null, dailyResults: {}, streak: 0, lastDaily: 0, goals: { day: daySeed(), solves: [], three: false, clean: false, claimed: [], rerolled: false } }; }
export function parseProgress(raw) {
  try {
    const p = JSON.parse(raw); if (!p || p.version !== C.version) return freshProgress();
    const out = { ...freshProgress(), ...p };
    out.level = Math.max(1, Math.min(10000, Math.floor(Number(out.level) || 1)));
    out.theme = Math.max(0, Math.min(C.themes.length - 1, Math.floor(Number(out.theme) || 0)));
    out.bonus = Math.max(0, Number(out.bonus) || 0); out.tokens = Math.max(0, Math.min(C.maxTokens, Math.floor(Number(out.tokens) || 0)));
    for (const key of ['stars','doubled','dailyResults','chapters','records']) if (!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])) out[key] = {};
    if (!out.dailyTrail || !Array.isArray(out.dailyTrail.results)) out.dailyTrail = null;
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
export function spend(p, cost) { if (p.tokens < cost) return false; p.tokens -= cost; return true; }
export function complete(p, key, stones, par, resetUsed, stats = {}) {
  rollDay(p); const stars = stones <= par ? 3 : stones === par + 1 ? 2 : 1;
  const before = totalStars(p), first = !p.stars[key], old = p.records[key]; p.stars[key] = Math.max(p.stars[key] || 0, stars);
  const newRecord = !old || stones < old.stones || (stones === old.stones && stats.attempts < old.attempts);
  if (newRecord) p.records[key] = { stones, attempts: stats.attempts || 1, seconds: Math.round(stats.elapsed || 0) };
  if (first) p.tokens = Math.min(C.maxTokens, p.tokens + 1);
  if (!p.goals.solves.includes(key)) p.goals.solves.push(key);
  if (stars === 3) p.goals.three = true; if (!resetUsed) p.goals.clean = true;
  goals(p).forEach((g,i) => { if (g.value >= g.target && !p.goals.claimed.includes(i)) { p.goals.claimed.push(i); p.bonus += C.goalReward; } });
  let chapterReward = false;
  if (key.startsWith('l')) {
    const ch = chapter(Number(key.slice(1)));
    if (!p.chapters[ch.index] && Array.from({length:C.chapterLength}, (_,i) => p.stars[`l${ch.first + i}`]).every(Boolean)) {
      p.chapters[ch.index] = true; p.bonus += C.chapterBonus; p.tokens = Math.min(C.maxTokens, p.tokens + C.chapterTokens); chapterReward = true;
    }
  }
  // Keep detailed records bounded; best stars and chapter unlocks are retained.
  const keys = Object.keys(p.records); for (const key of keys.slice(0, Math.max(0, keys.length - C.recordLimit))) delete p.records[key];
  return { stars, gained: totalStars(p) - before, better: stones < par, newRecord, first, chapterReward };
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
  p.dailyResults[day] = { ...record, trail: true }; return record;
}
