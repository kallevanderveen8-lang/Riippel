import { C } from './config.js';
import { Wave, mulberry32, validPoint, distance2, cell } from './simulation.js';

const names = ['A small beginning', 'Between two lights', 'Better together', 'A quiet conversation', 'Three little suns', 'In harmony', 'Around the bend', 'An echo returns', 'A gathering of light', 'The whole pond'];
export function difficulty(number) {
  return { par: number < 3 ? 1 : number < 5 ? 2 : number < 10 ? 3 : number < 20 ? 4 : 5,
    count: number === 1 || number === 3 ? 1 : number < 5 ? 2 : number < 10 ? 3 : number < 20 ? 4 : number < 30 ? 5 : 6,
    rocks: number < 7 ? 0 : number < 12 ? 1 : 2, delays: number >= C.delayUnlock };
}
// Deterministic integer coordinates, no transcendental operations in generation.
function randomStone(rng, rocks) {
  for (;;) {
    const s = { x: 18 + Math.floor(rng() * 92), y: 18 + Math.floor(rng() * 92), delay: 0 };
    if (validPoint(s, rocks, C.wallMargin)) return s;
  }
}
export function candidatesFor(wave, solution, rocks, count, rng) {
  const all = wave.run(solution).slice(), single = new Float32Array(C.size * C.size);
  const options = [];
  for (let y = C.wallMargin; y < C.size - C.wallMargin; y += 2) for (let x = C.wallMargin; x < C.size - C.wallMargin; x += 2) {
    const i = cell(x, y), p = { x, y };
    if (all[i] >= C.marginAll * C.threshold && validPoint(p, rocks, C.wallMargin) && solution.every(s => distance2(p, s) >= C.lanternClearance ** 2)) options.push(p);
  }
  const indices = options.map(p=>cell(p.x,p.y));
  // Solve every height cell as before, but track peaks only at cells that could
  // become lanterns. This is exactly equivalent to filtering full peakSingle.
  for (const s of solution) {
    const p = wave.run([s], C.steps, indices);
    for (const i of indices) if (p[i] > single[i]) single[i] = p[i];
  }
  for (let j = options.length - 1; j >= 0; j--) if (single[cell(options[j].x,options[j].y)] > C.marginSingle * C.threshold) options.splice(j,1);
  // Fisher–Yates (rather than engine-dependent random sort comparator).
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  const center = { x: (solution[0].x + solution[1].x) / 2, y: (solution[0].y + solution[1].y) / 2 };
  options.sort((a, b) => distance2(a, center) - distance2(b, center));
  const lanterns = [];
  for (const p of options) {
    if (lanterns.every(l => distance2(l, p) >= C.lanternSpacing ** 2)) lanterns.push(p);
    if (lanterns.length === count) break;
  }
  return { lanterns, margins: lanterns.map(l => ({ all: all[cell(l.x, l.y)], single: single[cell(l.x, l.y)] })) };
}
export function generate(number, seed = number * 7919, daily = false) {
  const start = performance.now(), rng = mulberry32(seed), d = difficulty(number);
  if (number <= 2) return { number, seed, name: names[number - 1], par: 1, limit: 3, rocks: [], solution: [{ x: 64, y: 64, delay: 0 }], lanterns: number === 1 ? [{ x: 64, y: 49 }] : [{ x: 51, y: 64 }, { x: 77, y: 64 }], clearance: 0, generationMs: performance.now() - start };
  if (number === 3 || number === 4) {
    const solution = [{ x: 36, y: 64, delay: 0 }, { x: 92, y: 64, delay: 0 }];
    const lanterns = number === 3 ? [{x:64,y:64}] : [{x:64,y:54},{x:64,y:74}];
    const wave = new Wave(), all = wave.run(solution).slice(), single = wave.run([solution[0]]);
    return {number,seed,name:names[number-1],par:2,limit:4,rocks:[],solution,lanterns,clearance:C.lanternClearance,margins:lanterns.map(p=>({all:all[cell(p.x,p.y)],single:single[cell(p.x,p.y)]})),generationMs:performance.now()-start};
  }
  const rocks = d.rocks ? [{ x: 62 + Math.floor(rng() * 12), y: 40 + Math.floor(rng() * 12), rx: 5, ry: 10 }] : [];
  if (d.rocks > 1) rocks.push({ x: 42 + Math.floor(rng() * 14), y: 84 + Math.floor(rng() * 10), rx: 9, ry: 4 });
  const wave = new Wave(rocks);
  // Closely spaced pairs have too little strong interference far from the stones.
  // A seeded mirrored pair supplies reliable constructive bands, with extra
  // independent stones broadening the band on later levels.
  for (let attempt = 0; attempt < C.generationRetries; attempt++) {
    const cx = 54 + Math.floor(rng() * 20), cy = 54 + Math.floor(rng() * 20), spread = 27 + Math.floor(rng() * 3);
    let solution = [{ x: cx - spread, y: cy, delay: 0 }, { x: cx + spread, y: cy, delay: 0 }];
    if (rng() < 0.5) solution = solution.map(s => ({ x: s.y, y: s.x, delay: 0 }));
    if (!solution.every(s => validPoint(s, rocks, C.wallMargin))) continue;
    while (solution.length < d.par) {
      const s = randomStone(rng, rocks);
      if (solution.every(p => distance2(p, s) > C.stoneSpacing ** 2)) solution.push(s);
    }
    // Delays are optional initially; every fifth late pond uses a real delayed drop.
    if (d.delays && number % 5 === 0) solution[solution.length - 1].delay = 1;
    const result = candidatesFor(wave, solution, rocks, d.count, rng);
    if (result.lanterns.length === d.count) return { number, seed, name: daily ? 'One pond. Everyone.' : names[number - 1] || (d.delays ? 'A moment in time' : 'Where echoes meet'), par: d.par, limit: d.par + 2, rocks, solution, ...result, clearance: C.lanternClearance, generationMs: performance.now() - start, retries: attempt };
  }
  // Never ship an unverified or softened-margin fallback. The next deterministic
  // seed keeps searching with the same difficulty and original daily identity.
  const fallback = generate(number, (seed + 104729) >>> 0, daily);
  return { ...fallback, seed, generationMs: performance.now() - start, fallback: true };
}
export function canPlace(p, level, stones = [], ignore = -1) {
  return validPoint(p, level.rocks) && level.lanterns.every(l => distance2(p, l) >= level.clearance ** 2) && stones.every((s, i) => i === ignore || distance2(p, s) >= C.touchRadius ** 2);
}
