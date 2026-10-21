import { C } from './config.js';
import { daySeed } from './simulation.js';
export function freshProgress() { return { version: C.version, level: 1, stars: {}, bonus: 0, doubled: {}, theme: 0, muted: false, campaign: null, daily: null, dailyResults: {}, streak: 0, lastDaily: 0, goals: { day: daySeed(), solves: [], three: false, clean: false, claimed: [], rerolled: false } }; }
export function parseProgress(raw) {
  try {
    const p = JSON.parse(raw); if (!p || p.version !== C.version) return freshProgress();
    const out = { ...freshProgress(), ...p };
    out.level = Math.max(1, Math.min(100000, Math.floor(Number(out.level) || 1)));
    out.theme = Math.max(0, Math.min(C.themes.length - 1, Math.floor(Number(out.theme) || 0)));
    out.bonus = Math.max(0, Number(out.bonus) || 0);
    for (const key of ['stars','doubled','dailyResults']) if (!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])) out[key] = {};
    if (!out.goals || !Array.isArray(out.goals.solves) || !Array.isArray(out.goals.claimed)) out.goals = freshProgress().goals;
    rollDay(out); return out;
  } catch { return freshProgress(); }
}
export function rollDay(p, day = daySeed()) { if (p.goals.day !== day) p.goals = { day, solves: [], three: false, clean: false, claimed: [], rerolled: false }; }
export function totalStars(p) { return Object.values(p.stars).reduce((sum, v) => sum + Math.max(0, Math.min(3, Number(v) || 0)), 0) + p.bonus; }
export function goals(p) {
  const g = p.goals;
  return [ { title: g.rerolled ? 'Solve 2 different ponds' : 'Solve 5 different ponds', value: g.solves.length, target: g.rerolled ? 2 : C.goalSolves }, { title: 'Earn three stars', value: +g.three, target: 1 }, { title: 'Solve without reset', value: +g.clean, target: 1 } ];
}
export function complete(p, key, stones, par, resetUsed, dailyDay = null) {
  rollDay(p); const stars = stones <= par ? 3 : stones === par + 1 ? 2 : 1;
  const before = totalStars(p); p.stars[key] = Math.max(p.stars[key] || 0, stars);
  if (!p.goals.solves.includes(key)) p.goals.solves.push(key);
  if (stars === 3) p.goals.three = true; if (!resetUsed) p.goals.clean = true;
  goals(p).forEach((g,i) => { if (g.value >= g.target && !p.goals.claimed.includes(i)) { p.goals.claimed.push(i); p.bonus += C.goalReward; } });
  if (dailyDay !== null && !p.dailyResults[dailyDay]) {
    p.streak = p.lastDaily === dailyDay - 1 ? p.streak + 1 : 1; p.lastDaily = dailyDay;
    p.dailyResults[dailyDay] = { stars, stones };
  } else if (dailyDay !== null && stars > (p.dailyResults[dailyDay]?.stars || 0)) p.dailyResults[dailyDay] = { stars, stones };
  return { stars, gained: totalStars(p) - before, better: stones < par };
}
