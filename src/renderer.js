import { C } from './config.js';
import { mulberry32 } from './simulation.js';

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
function hash(x, y, seed = 17) { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; }
function noise(x, y, seed = 17) { const ix = Math.floor(x), iy = Math.floor(y); let u = x - ix, v = y - iy; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), u), mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), u), v); }
function fbm(x, y, seed = 17) { return noise(x, y, seed) * .55 + noise(x * 2, y * 2, seed + 5) * .27 + noise(x * 4, y * 4, seed + 11) * .12 + noise(x * 8, y * 8, seed + 23) * .06; }
function surface(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Each stone is a shaded, irregular mineral surface, generated once and cached.
// No bitmaps, fonts or other visual assets are downloaded.
function stoneTexture(seed, size) {
  const canvas = surface(size), ctx = canvas.getContext('2d'), image = ctx.createImageData(size, size), d = image.data;
  const warm = (seed % 5) * 3, angle = seed * .71, ca = Math.cos(angle), sa = Math.sin(angle);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x / size - .5) * 2.15, py = (y / size - .5) * 2.15;
    const nx = px * ca - py * sa, ny = px * sa + py * ca;
    const grain = fbm(x / size * 12, y / size * 12, seed), edge = 1 + (noise(px * 3 + 9, py * 3 + 9, seed) - .5) * .23;
    const r2 = (nx * nx + ny * ny * 1.16) / (edge * edge), p = (y * size + x) * 4;
    if (r2 > 1.02) continue;
    const z = Math.sqrt(Math.max(0, 1 - r2)), light = clamp(-px * .36 - py * .43 + z * .77, .08, 1);
    const fleck = hash(x, y, seed) - .5, mineral = grain * 22 + fleck * 18;
    const seam = Math.abs(fbm(x / size * 4, y / size * 4, seed + 63) - .48);
    const vein = seam < .012 ? 12 * (1 - seam / .012) : 0;
    const wet = r2 > .72 ? .76 + .24 * (1 - r2) / .28 : 1;
    d[p] = ((57 + warm) * (.62 + light) + mineral + vein) * wet;
    d[p + 1] = ((61 + warm * .7) * (.62 + light) + mineral + vein) * wet;
    d[p + 2] = ((60 + warm * .3) * (.62 + light) + mineral + vein) * wet;
    d[p + 3] = clamp((1.02 - r2) * size / 3) * 255;
  }
  ctx.putImageData(image, 0, 0); return canvas;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.off = surface(1); this.octx = this.off.getContext('2d', { alpha: false });
    this.theme = C.themes[0]; this.bursts = []; this.zoom = 0; this.cachedTheme = null;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rocks = Array.from({ length: C.render.stoneVariants }, (_, i) => stoneTexture(71 + i * 29, C.render.stoneTexture));
    this.sines = Float32Array.from({ length: 2048 }, (_, i) => Math.sin(i / 2048 * Math.PI * 2));
    this.view = { x: 0, y: 0, size: 1 };
    new ResizeObserver(() => this.resize()).observe(canvas); this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, C.render.dpr);
    if (!rect.width || !rect.height) return;
    this.width = rect.width; this.height = rect.height; this.dpr = dpr;
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    const compact = rect.width <= 750, landscape = rect.height <= 560 && rect.width > rect.height;
    const top = compact ? 141 : 104, bottom = 191;
    let size, x, y;
    if (landscape) { size = Math.max(150, Math.min(rect.height - 120, rect.width - 310)); x = (rect.width - 250 - size) / 2; y = 65; }
    else { size = Math.max(150, Math.min(rect.width - 24, rect.height - top - bottom)); x = (rect.width - size) / 2; y = top + Math.max(0, (rect.height - top - bottom - size) / 2); }
    this.view = { x, y, size };
    const scale = Math.min(1, C.render.waterResolution / Math.max(rect.width, rect.height));
    this.off.width = Math.ceil(rect.width * scale); this.off.height = Math.ceil(rect.height * scale);
    this.image = this.octx.createImageData(this.off.width, this.off.height);
    this.buildScene();
  }
  point(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(), v = this.view;
    return { x: Math.round((clientX - r.left - v.x) / v.size * C.size), y: Math.round((clientY - r.top - v.y) / v.size * C.size) };
  }
  buildScene() {
    const w = this.off.width, h = this.off.height, count = w * h;
    this.details = new Float32Array(count * 6); this.reflection = new Uint8ClampedArray(count * 3);
    const bed = surface(w, h), b = bed.getContext('2d');
    b.fillStyle = '#55594b'; b.fillRect(0, 0, w, h);
    const rng = mulberry32(72419);
    // Submerged gravel is actual cached stone material, visible through shallows.
    for (let i = 0; i < C.render.gravelCount; i++) {
      const x = rng() * w, y = rng() * h, r = 1 + rng() * 9;
      b.globalAlpha = .3 + rng() * .5;
      b.drawImage(this.rocks[i % this.rocks.length], x - r, y - r, r * 2, r * 1.5);
    }
    b.globalAlpha = 1; this.bed = b.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, i = y * w + x, j = i * 6;
      const terrain = fbm(u * 7, v * 7, 51), cloud = fbm(u * 3, v * 4, 113);
      const left = Math.exp(-((u + .10) ** 2 * 14 + (v - .80) ** 2 * 2));
      const right = Math.exp(-((u - 1.08) ** 2 * 18 + (v - .15) ** 2 * 5));
      const shallow = clamp((left + right) * .8 + terrain * .09);
      this.details[j] = noise(u * 15, v * 20, 7); this.details[j + 1] = noise(u * 31, v * 45, 47);
      this.details[j + 2] = shallow; this.details[j + 3] = cloud;
      this.details[j + 4] = u * 85 + v * 134; this.details[j + 5] = u * 139 - v * 73 + terrain * 13;
      // Soft reflected canopy, irregular and concentrated near the bank.
      const canopy = clamp((noise(u * 18, v * 12, 33) * .65 + noise(u * 40, v * 15, 99) * .35 - .32) * 2) * clamp((.23 - u) * 4 + (u - .83) * 3);
      const k = i * 3, t = this.theme;
      for (let c = 0; c < 3; c++) this.reflection[k + c] = t.base[c] + cloud * t.light[c] - canopy * (19 + c * 4);
    }
    this.foreground = surface(this.canvas.width, this.canvas.height);
    const f = this.foreground.getContext('2d'); f.scale(this.dpr, this.dpr);
    const W = this.width, H = this.height, random = mulberry32(1803);
    // Cropped shoreline, kept outside the playable square. Natural silhouettes
    // continue beyond the camera rather than forming a decorative frame.
    for (let side = 0; side < 2; side++) {
      const cx = side ? W + 23 : -24, cy = side ? H * .19 : H * .78, extent = Math.min(65, W * .11);
      const shadow = f.createRadialGradient(cx, cy, 4, cx, cy, extent * 2.2);
      shadow.addColorStop(0, '#16231c99'); shadow.addColorStop(1, '#16231c00'); f.fillStyle = shadow; f.fillRect(cx - extent * 2.2, cy - extent * 2.2, extent * 4.4, extent * 4.4);
      for (let i = 0; i < 64; i++) {
        const px = cx + (random() - .5) * extent * 1.4, py = cy + (random() - .5) * extent * 4.5, r = 7 + random() * 20;
        f.save(); f.translate(px, py); f.rotate(random() * 6.28); f.shadowColor = '#101a1bc0'; f.shadowBlur = 7; f.shadowOffsetY = 5; f.drawImage(this.rocks[i % this.rocks.length], -r, -r, r * 2, r * 1.7); f.restore();
      }
      for (let i = 0; i < 55; i++) {
        const px = cx + (random() - .5) * extent, py = cy + (random() - .5) * extent * 4, length = 15 + random() * 48, lean = (side ? -1 : 1) * (8 + random() * 26);
        f.strokeStyle = ['#474f35','#646949','#7b7751','#383f30'][i % 4]; f.lineWidth = .7 + random(); f.beginPath(); f.moveTo(px, py); f.quadraticCurveTo(px + lean, py - length * .4, px + lean * .9, py - length); f.stroke();
      }
    }
    this.cachedTheme = this.theme;
  }
  burst(x, y, time) { this.bursts.push({ x, y, time }); }
  water(wave, time) {
    const w = this.off.width, h = this.off.height, data = this.image.data, field = wave.h, v = this.view;
    const sx = this.width / w, sy = this.height / h, inv = C.size / v.size, d = this.details, ref = this.reflection;
    const t = this.reduced ? 0 : time, sines = this.sines, phase = t * 117, phase2 = t * 83;
    for (let y = 0; y < h; y++) {
      const gy = (y * sy - v.y) * inv, iy = Math.floor(gy), fy = gy - iy;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, j = i * 6, p = i * 4, k = i * 3;
        const gx = (x * sx - v.x) * inv, ix = Math.floor(gx), fx = gx - ix;
        let nx = 0, ny = 0, height = 0;
        if (ix > 0 && ix < 126 && iy > 0 && iy < 126) {
          const c = iy * 128 + ix;
          const a = mix(field[c], field[c + 1], fx), b = mix(field[c + 128], field[c + 129], fx);
          height = mix(a, b, fy);
          nx = mix(field[c + 1] - field[c - 1], field[c + 129] - field[c + 127], fy);
          ny = mix(field[c + 128] - field[c - 128], field[c + 129] - field[c - 127], fx);
          const edge = clamp(Math.min(gx, gy, 127 - gx, 127 - gy) / 3); nx *= edge; ny *= edge;
        }
        const wind1 = sines[(d[j + 4] * 760 + phase + d[j] * 1200) & 2047];
        const wind2 = sines[(d[j + 5] * 410 - phase2 + d[j + 1] * 700) & 2047];
        const ambient = wind1 * .7 + wind2 * .4;
        const normal = nx * .7 + ny * .9;
        const light = clamp(normal * C.render.normalGain, -36, 50) + ambient * 5.5;
        const rx = Math.max(0, Math.min(w - 1, Math.round(x + nx * 70 + wind1 * 1.8)));
        const ry = Math.max(0, Math.min(h - 1, Math.round(y + ny * 70 + wind2 * 1.8)));
        const ri = (ry * w + rx) * 3, bi = (ry * w + rx) * 4;
        const shallow = d[j + 2], glitter = Math.max(0, ambient - .92) * 12 * d[j + 3];
        const reflectionMix = .94 - shallow * .60;
        const crest = clamp(height * 16, -.7, .7);
        data[p] = mix(this.bed[bi] * .77, ref[ri], reflectionMix) + light + glitter + crest;
        data[p + 1] = mix(this.bed[bi + 1] * .82, ref[ri + 1], reflectionMix) + light + glitter + crest;
        data[p + 2] = mix(this.bed[bi + 2] * .83, ref[ri + 2], reflectionMix) + light * 1.02 + glitter;
        data[p + 3] = 255;
      }
    }
    this.octx.putImageData(this.image, 0, 0);
  }
  draw(wave, level, stones, lit, time, running, hints = [], hover = null) {
    if (this.cachedTheme !== this.theme) this.buildScene();
    this.water(wave, time);
    const ctx = this.ctx, W = this.width, H = this.height, v = this.view, scale = v.size / C.size;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.off, 0, 0, W, H);
    ctx.save();
    if (this.zoom && !this.reduced) { const z = 1 + this.zoom * .014; ctx.translate(v.x + v.size / 2, v.y + v.size / 2); ctx.scale(z, z); ctx.translate(-v.x - v.size / 2, -v.y - v.size / 2); }
    ctx.translate(v.x, v.y); ctx.scale(scale, scale);
    // An unobtrusive preview boundary appears only when the pointer leaves the
    // playable water. It makes the fixed physical domain legible on wide screens.
    if (hover && !running && (hover.x < 7 || hover.x > 121 || hover.y < 7 || hover.y > 121)) {
      ctx.strokeStyle = '#d9e1df22'; ctx.lineWidth = .15; ctx.setLineDash([.5, 1.5]); ctx.strokeRect(7, 7, 114, 114); ctx.setLineDash([]);
    }
    if (!running && level.clearance) for (const l of level.lanterns) {
      ctx.beginPath(); ctx.arc(l.x, l.y, level.clearance, 0, Math.PI * 2); ctx.strokeStyle = '#dfd9ba38'; ctx.lineWidth = .16; ctx.setLineDash([.6, 1.8]); ctx.stroke(); ctx.setLineDash([]);
    }
    for (let i = 0; i < level.rocks.length; i++) {
      const r = level.rocks[i];
      ctx.save(); ctx.translate(r.x, r.y);
      ctx.fillStyle = '#131b20aa'; ctx.beginPath(); ctx.ellipse(.6, .9, r.rx * 1.08, r.ry * 1.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b9c9cd66'; ctx.lineWidth = .23; ctx.beginPath(); ctx.ellipse(0, 0, r.rx * 1.04, r.ry * 1.03, 0, .2, Math.PI * 1.5); ctx.stroke();
      ctx.drawImage(this.rocks[(i + 2) % this.rocks.length], -r.rx * 1.08, -r.ry * 1.08, r.rx * 2.16, r.ry * 2.16); ctx.restore();
    }
    for (const p of hints) { ctx.strokeStyle = '#f1e5c49e'; ctx.lineWidth = .28; ctx.setLineDash([.7, 1]); ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (hover && !running && hover.x >= 7 && hover.x <= 121 && hover.y >= 7 && hover.y <= 121) {
      ctx.strokeStyle = hover.valid ? '#e8e9e187' : '#e4bdac77'; ctx.lineWidth = .17; ctx.beginPath(); ctx.ellipse(hover.x, hover.y, 3, 3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    stones.forEach((stone, i) => {
      const age = (wave.stepNumber - (stone.delay || 0) * C.delaySteps) / C.delaySteps, sinking = running && age >= 0;
      const radius = Math.max(C.render.placedStoneRadius, C.render.stoneMinPixels / (2 * scale));
      ctx.save(); ctx.translate(stone.x, stone.y);
      if (sinking) ctx.globalAlpha = clamp(1 - age * 3.5, 0, 1);
      ctx.fillStyle = '#12232c77'; ctx.beginPath(); ctx.ellipse(.5, .8, radius * .9, radius * .65, -.3, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(-.4 + i * 1.2); ctx.drawImage(this.rocks[(i + 5) % this.rocks.length], -radius, -radius, radius * 2, radius * 2); ctx.restore();
      if (sinking && age < .38 && !this.reduced) {
        ctx.save(); ctx.translate(stone.x, stone.y); ctx.strokeStyle = `rgba(225,237,238,${(1 - age / .38) * .6})`; ctx.lineWidth = .18;
        ctx.beginPath(); ctx.arc(0, 0, .6 + age * 9, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < 9; k++) { const a = k * 2.3999, r = age * 12; ctx.fillStyle = `rgba(218,232,235,${clamp(1 - age / .32) * .7})`; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r - Math.sin(age / .38 * Math.PI) * 2, .12, .23, a, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
      }
      if (level.number >= C.delayUnlock && (!sinking || age < 0)) { ctx.fillStyle = '#edf0ea'; ctx.font = '2.6px Arial'; ctx.textAlign = 'center'; ctx.fillText(`${stone.delay || 0}s`, stone.x, stone.y + 5); }
    });
    level.lanterns.forEach((l, i) => this.lantern(ctx, l, lit[i], time, i, wave));
    this.bursts = this.bursts.filter(b => time - b.time < 1.4);
    if (!this.reduced) for (const b of this.bursts) {
      const age = time - b.time; ctx.strokeStyle = `rgba(242,218,166,${(1 - age / 1.4) * .24})`; ctx.lineWidth = .2; ctx.beginPath(); ctx.arc(b.x, b.y, 3 + age * 11, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore(); ctx.drawImage(this.foreground, 0, 0, W, H);
    const shade = ctx.createLinearGradient(0, H * .65, 0, H); shade.addColorStop(0, '#15263200'); shade.addColorStop(1, '#15263248'); ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  }
  lantern(ctx, l, on, time, i, wave) {
    const bob = this.reduced ? 0 : Math.sin(time * 1.2 + i * 1.7) * .13;
    ctx.save(); ctx.translate(l.x, l.y + bob);
    const objectScale = Math.max(1, C.render.lanternMinPixels / (5 * this.view.size / C.size)); ctx.scale(objectScale, objectScale);
    if (on) {
      const g = ctx.createRadialGradient(0, 0, .4, 0, 0, 12); g.addColorStop(0, '#edb65c57'); g.addColorStop(.25, '#d7aa5520'); g.addColorStop(1, '#dfb66700'); ctx.fillStyle = g; ctx.fillRect(-12, -12, 24, 24);
      // Broken amber reflections follow the surface, rather than a neon halo.
      for (let r = 0; r < 12; r++) { const dy = 2.5 + r * .55, wobble = Math.sin(time * 1.8 + r * 1.3) * .6; ctx.strokeStyle = `rgba(235,192,117,${(.22 - r * .016)})`; ctx.lineWidth = .27; ctx.beginPath(); ctx.moveTo(-1.3 + wobble, dy); ctx.lineTo(1.3 + wobble, dy); ctx.stroke(); }
    }
    ctx.fillStyle = '#14222c88'; ctx.beginPath(); ctx.ellipse(.3, .65, 2.75, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    const wood = ctx.createLinearGradient(-2, -2, 2, 2); wood.addColorStop(0, '#b39b70'); wood.addColorStop(.45, '#685845'); wood.addColorStop(1, '#3e3830');
    ctx.fillStyle = wood; ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 2.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c1aa7d77'; ctx.lineWidth = .13; ctx.beginPath(); ctx.ellipse(0, -.1, 2.17, 1.99, 0, 0, Math.PI * 2); ctx.stroke();
    const glass = ctx.createRadialGradient(-.45, -.65, .1, 0, 0, 1.8);
    glass.addColorStop(0, on ? '#fff5d8' : '#dfdcd0'); glass.addColorStop(.35, on ? '#f3d190' : '#b8b9ad'); glass.addColorStop(.8, on ? '#bd8748' : '#727e7d'); glass.addColorStop(1, '#455257');
    ctx.fillStyle = glass; ctx.beginPath(); ctx.arc(0, -.15, 1.67, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#574d3c'; ctx.lineWidth = .17; ctx.beginPath(); ctx.moveTo(-1.1, -1.4); ctx.lineTo(-.7, 1.2); ctx.moveTo(1, -1.4); ctx.lineTo(.7, 1.2); ctx.stroke();
    ctx.fillStyle = on ? '#fff3c3' : '#66685c'; ctx.beginPath(); ctx.ellipse(0, -.15, .28, .45, .15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f4f0d49c'; ctx.lineWidth = .14; ctx.beginPath(); ctx.arc(-.1, -.3, 1.23, 3.5, 4.8); ctx.stroke();
    if (!on && wave.stepNumber >= C.steps) { const ratio = Math.min(1, wave.peak[Math.round(l.y) * C.size + Math.round(l.x)] / C.threshold); ctx.strokeStyle = '#dac49b99'; ctx.lineWidth = .22; ctx.beginPath(); ctx.arc(0, 0, 3.5, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
}
