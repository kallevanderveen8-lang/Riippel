import { C } from './config.js';
export function mulberry32(seed) {
  return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function daySeed(date = new Date()) { return Math.floor(date.getTime() / 86400000); }
export const cell = (x, y) => Math.round(y) * C.size + Math.round(x);
export const distance2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export function makeWalls(rocks = []) {
  const n = C.size, walls = new Uint8Array(n * n);
  for (const r of rocks) for (let y = Math.max(0, r.y - r.ry); y <= Math.min(n - 1, r.y + r.ry); y++)
    for (let x = Math.max(0, r.x - r.rx); x <= Math.min(n - 1, r.x + r.rx); x++)
      if (((x - r.x) / r.rx) ** 2 + ((y - r.y) / r.ry) ** 2 <= 1) walls[y * n + x] = 1;
  return walls;
}
export class Wave {
  constructor(rocks = []) {
    const n = C.size, len = n * n;
    this.h = new Float32Array(len); this.old = new Float32Array(len); this.next = new Float32Array(len);
    this.peak = new Float32Array(len); this.walls = makeWalls(rocks);
    this.edgeMask = new Uint8Array(len); this.left = new Uint16Array(len); this.right = new Uint16Array(len);
    this.up = new Uint16Array(len); this.down = new Uint16Array(len);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      this.left[i] = x > 0 && !this.walls[i - 1] ? i - 1 : i;
      this.right[i] = x < n - 1 && !this.walls[i + 1] ? i + 1 : i;
      this.up[i] = y > 0 && !this.walls[i - n] ? i - n : i;
      this.down[i] = y < n - 1 && !this.walls[i + n] ? i + n : i;
    }
    for (let i = 0; i < len; i++) this.edgeMask[i] = this.walls[i] ? 2 : (this.left[i] === i || this.right[i] === i || this.up[i] === i || this.down[i] === i ? 1 : 0);
    this.hasRocks = rocks.length > 0; this.stepNumber = 0; this.stones = [];
  }
  reset(stones = []) { this.h.fill(0); this.old.fill(0); this.next.fill(0); this.peak.fill(0); this.stepNumber = 0; this.stones = stones.map(s => ({ ...s })); }
  bump(s) {
    const n = C.size, R = C.radius, rr = R * R;
    for (let y = s.y - R + 1; y < s.y + R; y++) for (let x = s.x - R + 1; x < s.x + R; x++) {
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const i = y * n + x, d = ((x - s.x) ** 2 + (y - s.y) ** 2) / rr;
      if (d >= 1 || this.walls[i]) continue;
      const v = C.amplitude * (1 - d) * (1 - d);
      this.h[i] = Math.fround(this.h[i] + v); this.old[i] = Math.fround(this.old[i] + v);
      if (this.h[i] > this.peak[i]) this.peak[i] = this.h[i];
    }
  }
  step() {
    for (let j = 0; j < this.stones.length; j++) if ((this.stones[j].delay || 0) * C.delaySteps === this.stepNumber) this.bump(this.stones[j]);
    const { h, old, next, peak, left, right, up, down, walls } = this;
    const mask = this.edgeMask, n = C.size;
    for (let i = 0; i < h.length; i++) {
      if (mask[i] === 2) continue;
      const neighbors = mask[i] === 0 ? h[i - 1] + h[i + 1] + h[i - n] + h[i + n] : h[left[i]] + h[right[i]] + h[up[i]] + h[down[i]];
      const value = Math.fround((2 * h[i] - old[i] + C.c2 * (neighbors - 4 * h[i])) * C.damp);
      next[i] = value; if (value > peak[i]) peak[i] = value;
    }
    this.old = h; this.h = next; this.next = old; this.stepNumber++;
  }
  run(stones, steps = C.steps) { this.reset(stones); for (let i = 0; i < steps; i++) this.step(); return this.peak; }
}
export function validPoint(p, rocks = [], margin = C.placementMargin) {
  if (p.x < margin || p.y < margin || p.x > C.size - 1 - margin || p.y > C.size - 1 - margin) return false;
  return rocks.every(r => ((p.x - r.x) / (r.rx + margin)) ** 2 + ((p.y - r.y) / (r.ry + margin)) ** 2 > 1);
}
