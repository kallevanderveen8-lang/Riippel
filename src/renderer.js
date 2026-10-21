import { C } from './config.js';
import { mulberry32 } from './simulation.js';
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.off = document.createElement('canvas'); this.off.width = this.off.height = C.size;
    this.octx = this.off.getContext('2d'); this.image = this.octx.createImageData(C.size, C.size);
    this.theme = C.themes[0]; this.bursts = []; this.zoom = 0;
    const rng = mulberry32(2026);
    this.motes = Array.from({ length: 44 }, () => ({ x: rng(), y: rng(), r: rng() * 1.2 + 0.3, phase: rng() * 6.28 }));
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    new ResizeObserver(() => this.resize()).observe(canvas); this.resize();
  }
  resize() { const size = this.canvas.getBoundingClientRect().width; this.canvas.width = this.canvas.height = Math.round(size * Math.min(devicePixelRatio || 1, C.render.dpr)); }
  burst(x, y, time) { this.bursts.push({ x, y, time }); }
  draw(wave, level, stones, lit, time, running, hints = [], hover = null) {
    const ctx = this.ctx, w = this.canvas.width, s = w / C.size, { h } = wave, { base, light } = this.theme, data = this.image.data;
    for (let y = 0; y < C.size; y++) for (let x = 0; x < C.size; x++) {
      const i = y * C.size + x, p = i * 4;
      const normal = (h[i] - h[Math.min(i + 1, h.length - 1)]) * 0.65 + (h[i] - h[Math.min(i + C.size, h.length - 1)]) * 0.85;
      const value = Math.max(-0.06, h[i]) * C.render.fieldGain + normal * C.render.normalGain;
      const edge = Math.min(x, y, C.size - 1 - x, C.size - 1 - y) / 24;
      const vignette = Math.min(1, 0.6 + edge * 0.4);
      for (let c = 0; c < 3; c++) data[p + c] = (base[c] + value * light[c] / 100) * vignette;
      data[p + 3] = 255;
    }
    this.octx.putImageData(this.image, 0, 0); ctx.save(); ctx.imageSmoothingEnabled = true;
    if (this.zoom && !this.reduced) { const z = 1 + this.zoom * 0.025; ctx.translate(w / 2, w / 2); ctx.scale(z, z); ctx.translate(-w / 2, -w / 2); }
    ctx.drawImage(this.off, 0, 0, w, w);
    const glow = ctx.createRadialGradient(w * 0.42, w * 0.4, 0, w / 2, w / 2, w * 0.7);
    glow.addColorStop(0, '#61b6a00d'); glow.addColorStop(1, '#00000055'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, w);
    ctx.scale(s, s);
    // Quiet contour lines and tiny drifting reflections give the still pond depth.
    if (!running) {
      ctx.lineWidth = 0.15; ctx.strokeStyle = '#8dcbb313';
      for (let j = 0; j < 8; j++) { ctx.beginPath(); ctx.ellipse(59, 63, 24 + j * 10, 19 + j * 9, -0.25, 0, Math.PI * 2); ctx.stroke(); }
    }
    for (const p of this.motes) {
      ctx.fillStyle = `rgba(165,210,187,${0.10 + (Math.sin(time * 0.3 + p.phase) + 1) * 0.07})`;
      ctx.beginPath(); ctx.arc(p.x * 124 + 2, p.y * 124 + 2, p.r * 0.17, 0, Math.PI * 2); ctx.fill();
    }
    // Non-placeable lantern sanctuaries: visible, gentle dashed circles.
    if (!running && level.clearance) {
      ctx.lineWidth = 0.18; ctx.setLineDash([0.5, 1.4]); ctx.strokeStyle = '#cdbb8230'; ctx.fillStyle = '#d7bf7004';
      for (const l of level.lanterns) { ctx.beginPath(); ctx.arc(l.x, l.y, level.clearance, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    for (const r of level.rocks) {
      const g = ctx.createLinearGradient(r.x - r.rx, r.y - r.ry, r.x + r.rx, r.y + r.ry); g.addColorStop(0, '#344344'); g.addColorStop(0.4, '#1c2c30'); g.addColorStop(1, '#101e24');
      ctx.save(); ctx.translate(r.x, r.y); ctx.shadowBlur = 3 * s; ctx.shadowColor = '#0009'; ctx.shadowOffsetY = s;
      ctx.fillStyle = g; ctx.strokeStyle = '#4a625c'; ctx.lineWidth = .35; ctx.beginPath();
      ctx.ellipse(0, 0, r.rx, r.ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(-r.rx * .6, -r.ry * .55); ctx.lineTo(0, -r.ry * .8); ctx.lineTo(r.rx * .65, -r.ry * .2); ctx.lineTo(r.rx * .2, r.ry * .35); ctx.strokeStyle = '#61766b44'; ctx.stroke(); ctx.restore();
    }
    for (const p of hints) {
      ctx.strokeStyle = `rgba(191,224,199,${.2 + Math.sin(time * 2) * .1})`; ctx.lineWidth = .45; ctx.setLineDash([1, 1.2]); ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (hover && !running) { ctx.beginPath(); ctx.arc(hover.x, hover.y, 3, 0, Math.PI * 2); ctx.strokeStyle = hover.valid ? '#b7e2c9aa' : '#dba19199'; ctx.lineWidth = .3; ctx.stroke(); }
    for (const stone of stones) {
      const pending = running && wave.stepNumber < (stone.delay || 0) * C.delaySteps;
      ctx.save(); ctx.globalAlpha = running && !pending ? .35 : 1;
      const g = ctx.createRadialGradient(stone.x, stone.y, 0, stone.x, stone.y, 5); g.addColorStop(0, '#c7edd12a'); g.addColorStop(1, '#c7edd100'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(stone.x, stone.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.theme.stone; ctx.shadowColor = '#d7fbe4'; ctx.shadowBlur = 2 * s; ctx.beginPath(); ctx.ellipse(stone.x, stone.y, 1.2, 1, -.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (level.number >= C.delayUnlock) { ctx.fillStyle = '#cbdbcd'; ctx.font = '2.7px Arial'; ctx.textAlign = 'center'; ctx.fillText(`${stone.delay || 0}s`, stone.x, stone.y + 5); }
    }
    level.lanterns.forEach((l, i) => {
      const on = lit[i], pulse = this.reduced ? 1 : 1 + Math.sin(time * 2 + i) * .06, radius = on ? 14 : 7;
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, radius * pulse);
      g.addColorStop(0, on ? '#ffd88d80' : '#e8c58924'); g.addColorStop(.3, on ? '#eebd5740' : '#ebc98710'); g.addColorStop(1, '#fbd47a00');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, radius * pulse, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = on ? '#fbe1a4' : '#8f7953'; ctx.strokeStyle = on ? '#fff1c9' : '#c5ac75'; ctx.lineWidth = .35; ctx.shadowColor = '#ffcd71'; ctx.shadowBlur = on ? 3 * s : 0; ctx.fillRect(-1.4, -1.4, 2.8, 2.8); ctx.strokeRect(-1.4, -1.4, 2.8, 2.8); ctx.restore();
      ctx.beginPath(); ctx.ellipse(l.x, l.y + 3.1, 3.7, 1, 0, 0, Math.PI * 2); ctx.lineWidth = .2; ctx.strokeStyle = on ? '#fbe6ac55' : '#b8b98630'; ctx.stroke();
    });
    this.bursts = this.bursts.filter(b => time - b.time < 1.7);
    if (!this.reduced) for (const b of this.bursts) {
      const age = time - b.time; ctx.strokeStyle = `rgba(255,226,165,${(1 - age / 1.7) * .5})`; ctx.lineWidth = .25; ctx.beginPath(); ctx.arc(b.x, b.y, age * 14 + 2, 0, Math.PI * 2); ctx.stroke();
      for (let j = 0; j < C.render.particles; j++) { const a = j * 2.39996, r = age * (5 + j % 5); ctx.fillStyle = `rgba(255,233,187,${Math.max(0,1 - age)})`; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, .25, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
}
