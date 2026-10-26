import { C } from './config.js';
import { mulberry32 } from './simulation.js';

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
function hash(x, y, seed = 17) { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; }
function noise(x, y, seed = 17) { const ix = Math.floor(x), iy = Math.floor(y); let u = x - ix, v = y - iy; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), u), mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), u), v); }
function fbm(x, y, seed = 17) { return noise(x, y, seed) * .55 + noise(x * 2, y * 2, seed + 5) * .27 + noise(x * 4, y * 4, seed + 11) * .12 + noise(x * 8, y * 8, seed + 23) * .06; }
function causticEdge(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y); let first = 10, second = 10;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const px = ix + dx + hash(ix + dx, iy + dy, seed), py = iy + dy + hash(ix + dx, iy + dy, seed + 39);
    const distance = (x - px) ** 2 + (y - py) ** 2;
    if (distance < first) { second = first; first = distance; } else if (distance < second) second = distance;
  }
  return Math.max(0, 1 - (Math.sqrt(second) - Math.sqrt(first)) / .075) ** 2;
}
function surface(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Keep the generated mineral texture as a fallback if bundled art cannot load.
function stoneTexture(seed, size, color) {
  const canvas = surface(size), ctx = canvas.getContext('2d'), image = ctx.createImageData(size, size), d = image.data;
  const tone = color.match(/\w\w/g).map(c => parseInt(c, 16));
  const angle = seed * .71, ca = Math.cos(angle), sa = Math.sin(angle);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x / size - .5) * 2.32, py = (y / size - .5) * 2.32;
    const nx = px * ca - py * sa, ny = px * sa + py * ca;
    const theta = Math.atan2(ny, nx);
    const edge = .95 + Math.sin(theta * 3 + seed) * .055 + Math.cos(theta * 5 + seed * .3) * .035;
    const r2 = (nx * nx + ny * ny * (1.05 + seed % 3 * .07)) / (edge * edge), p = (y * size + x) * 4;
    if (r2 > 1.02) continue;
    const grain = fbm(nx * 7 + 12, ny * 7 + 12, seed), fleck = hash(x, y, seed);
    const z = Math.pow(Math.max(0, 1 - r2), .6);
    const facet = noise(nx * 5 + 12, ny * 6 + 13, seed + 121);
    const light = clamp(-px * .32 - py * .48 + z * .72 + (facet - .5) * .36);
    const mineral = (grain - .5) * 55 + (fleck - .5) * 14;
    const seam = Math.abs(ny + nx * .35 + (noise(nx * 3 + 10, ny * 3 + 10, seed) - .5) * .4 + .16);
    const vein = Math.max(0, 1 - seam / .027) * (13 + grain * 15);
    const quartz = clamp((noise(nx * 8 + 17, ny * 9 + 12, seed + 31) - .54) * 5) * 28;
    const wet = 1 - clamp((r2 - .58) / .42) * .28;
    // Broad diffuse light, a restrained wet glint and tiny quartz inclusions.
    const specular = Math.pow(clamp(-px * .38 - py * .53 + z * .75), 24) * 21;
    for (let c = 0; c < 3; c++) d[p + c] = (tone[c] * (.43 + light * .72) + mineral + vein + quartz) * wet + specular + (fleck > .97 ? light * 19 : 0);
    d[p + 3] = clamp((1.02 - r2) * size / 2) * 255;
  }
  ctx.putImageData(image, 0, 0); return canvas;
}
const rockCache = new Map();
const artURL = path => globalThis.__RIPPLE_ASSETS__?.[path] || path;
const lakeImages = new Map();
const photoMasks = new Map();
function lakeImage(theme) {
  if (!lakeImages.has(theme.art)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = artURL(theme.art);
    lakeImages.set(theme.art, image);
  }
  const image = lakeImages.get(theme.art);
  return image.complete && image.naturalWidth ? image : null;
}
function photoMask(theme,image) {
  if(photoMasks.has(theme.art))return photoMasks.get(theme.art);
  const width=512,height=288,canvas=surface(width,height),ctx=canvas.getContext('2d');
  ctx.drawImage(image,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height).data,alpha=new Uint8Array(width*height);
  for(let i=0;i<alpha.length;i++){
    const r=pixels[i*4],g=pixels[i*4+1],b=pixels[i*4+2];
    // Mineral-grey rock and warm leaves stay still; blue/green water carries
    // the animated light. The soft threshold preserves pale shallows.
    alpha[i]=Math.round(clamp(Math.max(g-r*1.02,b-r*1.07)/22)*255);
  }
  const mask={width,height,alpha};photoMasks.set(theme.art,mask);return mask;
}
const atlas = new Image();
let artVersion = 0;
atlas.onload = () => { rockCache.clear(); artVersion++; };
atlas.src = artURL('assets/stone-atlas.webp');
const boulder = new Image();
boulder.src = artURL('assets/boulder.webp');
function rocksFor(theme) {
  if (!rockCache.has(theme.stone)) rockCache.set(theme.stone, Array.from({ length: C.render.stoneVariants }, (_, i) => {
    if (!atlas.complete || !atlas.naturalWidth) return stoneTexture(71 + i * 29, C.render.stoneTexture, theme.stone);
    const side = atlas.height, canvas = surface(512), ctx = canvas.getContext('2d');
    ctx.translate(256, 256); ctx.rotate((i % 3 - 1) * .11);
    ctx.drawImage(atlas, (i % 3) * side, 0, side, side, -248, -248, 496, 496);
    return canvas;
  }));
  return rockCache.get(theme.stone);
}

export class Renderer {
  constructor(canvas, { theme = C.themes[0], preview = false } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.off = surface(1); this.octx = this.off.getContext('2d');
    this.theme = theme; this.preview = preview; this.bursts = []; this.zoom = 0; this.cachedTheme = null; this.thumbnails = new Map();
    this.timeOfDay='day';this.cosmetics={stone:'river',lantern:'bronze'};this.cosmeticCache=new Map();
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    this.motionPreference = motionPreference; this.userReduced = false;
    this.reduced = preview || motionPreference.matches;
    if (!preview) motionPreference.addEventListener('change',event=>{ this.reduced=this.userReduced || event.matches; });
    this.sines = Float32Array.from({ length: 2048 }, (_, i) => Math.sin(i / 2048 * Math.PI * 2));
    this.cameraScale = preview ? 1 : 1.08;
    this.view = { x: 0, y: 0, size: 1 };
    this.normalX = new Float32Array(C.size * C.size); this.normalY = new Float32Array(C.size * C.size);
    if (!preview) new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  resize() {
    const rect = this.preview ? this.canvas : this.canvas.getBoundingClientRect(), dpr = this.preview ? 1 : Math.min(devicePixelRatio || 1, C.render.dpr, 2048 / rect.width, 1152 / rect.height);
    if (!rect.width || !rect.height) return;
    const oldWidth = this.width, oldHeight = this.height;
    const centerX = this.view.width ? (oldWidth / 2 - this.view.x) / this.view.width : .5;
    const centerY = this.view.height ? (oldHeight / 2 - this.view.y) / this.view.height : .5;
    this.width = rect.width; this.height = rect.height; this.dpr = dpr;
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    // Camera movement changes only the projection, never the physical puzzle.
    this.view = { x: rect.width * (.5 - centerX * this.cameraScale), y: rect.height * (.5 - centerY * this.cameraScale), width: rect.width * this.cameraScale, height: rect.height * this.cameraScale, size: Math.min(rect.width, rect.height) * this.cameraScale };
    this.clampCamera();
    const scale = Math.min(1, C.render.waterResolution / Math.max(rect.width, rect.height));
    this.off.width = Math.ceil(rect.width * scale); this.off.height = Math.ceil(rect.height * scale);
    this.image = this.octx.createImageData(this.off.width, this.off.height);
    this.buildScene();
  }
  thumbnail(theme) {
    return artURL(theme.art.replace('assets/', 'assets/thumb-'));
  }
  setReducedMotion(value) { this.userReduced = !!value; this.reduced = this.preview || this.userReduced || this.motionPreference.matches; }
  clampCamera() {
    const v = this.view;
    v.x = Math.max(this.width - v.width, Math.min(0, v.x));
    v.y = Math.max(this.height - v.height, Math.min(0, v.y));
  }
  resetCamera() {
    this.cameraScale = this.preview ? 1 : 1.08;
    this.view.width = this.width * this.cameraScale;
    this.view.height = this.height * this.cameraScale;
    this.view.size = Math.min(this.width,this.height) * this.cameraScale;
    this.view.x = (this.width - this.view.width) / 2;
    this.view.y = (this.height - this.view.height) / 2;
  }
  zoomAt(clientX, clientY, factor) {
    if (this.preview) return;
    const rect = this.canvas.getBoundingClientRect(), anchorX = clientX - rect.left, anchorY = clientY - rect.top;
    const old = this.view, nextScale = Math.max(1.08,Math.min(2.4,this.cameraScale * factor));
    const gx = (anchorX - old.x) / old.width, gy = (anchorY - old.y) / old.height;
    this.cameraScale = nextScale;
    this.view = { x:anchorX - gx * this.width * nextScale, y:anchorY - gy * this.height * nextScale, width:this.width * nextScale, height:this.height * nextScale, size:Math.min(this.width,this.height) * nextScale };
    this.clampCamera();
  }
  pan(dx, dy) { if (this.preview) return; this.view.x += dx; this.view.y += dy; this.clampCamera(); }
  stonePreview(index) {
    const stone = this.stoneFor(index);
    if (!stone.previewURL) stone.previewURL = stone.toDataURL();
    return stone.previewURL;
  }
  stoneFor(index=0,id=this.cosmetics.stone) {
    const base=rocksFor(this.theme)[(index+5)%C.render.stoneVariants];
    if(id==='river')return base;
    const key=`${this.theme.name}:${index}:${id}:${artVersion}`;
    if(this.cosmeticCache.has(key))return this.cosmeticCache.get(key);
    const c=surface(512),ctx=c.getContext('2d');ctx.drawImage(base,0,0);
    const tints={slate:'#53677b',amber:'#c99650',sleepy:'#9d9bba',frog:'#6d9b5a',potato:'#b69a6a'};
    ctx.globalCompositeOperation='source-atop';ctx.fillStyle=tints[id]+'7a';ctx.fillRect(0,0,512,512);ctx.globalCompositeOperation='source-over';
    if(['sleepy','frog','potato'].includes(id)) {
      ctx.lineCap='round';ctx.lineWidth=13;ctx.strokeStyle='#243734';ctx.fillStyle='#243734';
      if(id==='sleepy') {
        for(const x of [190,318]){ctx.beginPath();ctx.arc(x,244,29,.12,Math.PI-.12);ctx.stroke();}
        ctx.beginPath();ctx.arc(255,308,16,0,Math.PI*2);ctx.fill();
      } else {
        for(const x of [191,319]) {ctx.beginPath();ctx.ellipse(x,246,12,19,0,0,Math.PI*2);ctx.fill();}
        ctx.beginPath();ctx.arc(255,276,70,.25,Math.PI-.25);ctx.stroke();
        if(id==='frog'){ctx.fillStyle='#e3d6ad';for(const x of [191,319]){ctx.beginPath();ctx.arc(x,246,4,0,Math.PI*2);ctx.fill();}}
      }
    }
    this.cosmeticCache.set(key,c);return c;
  }
  cosmeticPreview(kind,id) {
    if(kind==='stones')return this.stoneFor(0,id).toDataURL();
    const c=surface(160),ctx=c.getContext('2d');ctx.translate(80,80);ctx.scale(23,23);
    const previous=this.cosmetics;this.cosmetics={...previous,lantern:id};
    this.lantern(ctx,{x:0,y:0},true,0,0,{stepNumber:0});this.cosmetics=previous;
    return c.toDataURL();
  }
  get artVersion() { return artVersion; }
  point(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(), v = this.view;
    return { x: Math.round((clientX - r.left - v.x) / v.width * C.size), y: Math.round((clientY - r.top - v.y) / v.height * C.size) };
  }
  buildScene() {
    const w = this.off.width, h = this.off.height, count = w * h, theme = this.theme, scene = theme.scene;
    this.rocks = rocksFor(theme);
    this.details = new Float32Array(count * 6); this.reflection = new Uint8ClampedArray(count * 3); this.caustics = new Float32Array(count);
    const bed = surface(w, h), b = bed.getContext('2d'), rng = mulberry32(scene.seed);
    b.fillStyle = scene.bed; b.fillRect(0, 0, w, h);
    // Small pebbles sit beneath the water; visibility is controlled by depth.
    for (let i = 0; i < C.render.gravelCount; i++) {
      const x = rng() * w, y = rng() * h, r = .6 + rng() ** 2 * 7;
      b.globalAlpha = .18 + rng() * .42;
      b.drawImage(this.rocks[i % this.rocks.length], x - r, y - r, r * 2, r * 1.6);
    }
    b.globalAlpha = 1; this.bed = b.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, i = y * w + x, j = i * 6;
      const terrain = fbm(u * 5, v * 6, scene.seed), cloud = fbm(u * 2.7, v * 3.2, scene.seed + 113);
      const bankY = scene.banks[0];
      const left = Math.exp(-((u + .06) ** 2 * 27 + (v - bankY) ** 2 * 3.5));
      const right = Math.exp(-((u - 1.06) ** 2 * 33 + (v - scene.banks[1]) ** 2 * 6));
      const shallow = clamp((left + right) * .94 + (terrain - .5) * .22);
      const branch = noise(u * 14, v * 9, scene.seed + 33) * .65 + noise(u * 31, v * 24, scene.seed + 99) * .35;
      const canopy = clamp((branch - .28) * 2) * clamp((.36 - u) * 3.6 + (u - .71) * 3.4) * scene.canopy;
      const sky = .3 + cloud * .55 + Math.exp(-((u - .64) ** 2 * 9 + (v - .28) ** 2 * 5)) * .17;
      const sunlight = Math.exp(-((u - .82) ** 2 * 7 + (v - .16) ** 2 * 10));
      this.caustics[i] = causticEdge(u * 20 + terrain * 2.6, v * 16 + cloud * 2.4, scene.seed) * (shallow * .8 + sunlight * .38) * scene.clarity;
      this.details[j] = terrain; this.details[j + 1] = cloud;
      this.details[j + 2] = shallow; this.details[j + 3] = sky;
      // Long, coherent wind ripples. Low-frequency distortion avoids a marbled surface.
      this.details[j + 4] = u * 2400 + v * 26000 + terrain * 6400;
      this.details[j + 5] = u * 8200 - v * 18500 + cloud * 3900;
      const k = i * 3;
      for (let c = 0; c < 3; c++) this.reflection[k + c] = theme.base[c] + sky * theme.light[c] - canopy * (25 + c * 3) + sunlight * 16;
    }
    this.buildShore();
    this.cachedTheme = theme;
  }
  buildShore() {
    this.foreground = surface(this.canvas.width, this.canvas.height);
    const f = this.foreground.getContext('2d'); f.scale(this.dpr, this.dpr);
    const W = this.width, H = this.height, scene = this.theme.scene, random = mulberry32(scene.seed + 1803);
    const unit = this.preview ? W / 1216 : 1;
    for (let side = 0; side < 2; side++) {
      const cx = side ? W + 18 * unit : -20 * unit, cy = H * scene.banks[side];
      const extent = Math.min(60 * unit, W * .055) * scene.shore;
      const shadow = f.createRadialGradient(cx, cy, 0, cx, cy, extent * 2.6);
      shadow.addColorStop(0, '#102a1cb3'); shadow.addColorStop(1, '#102a1c00');
      f.fillStyle = shadow; f.fillRect(cx - extent * 3, cy - extent * 3, extent * 6, extent * 6);
      // Overlapping bank stones have dry crowns, dark waterlines and contact shadows.
      for (let i = 0; i < 62; i++) {
        const px = cx + (random() - .5) * extent * 1.4, py = cy + (random() - .5) * H * .66;
        const r = (8 + random() * 21) * unit * (scene.plants === 'alpine' ? 1.3 : 1);
        f.save(); f.translate(px, py); f.rotate(random() * 6.28);
        f.shadowColor = '#081b1caf'; f.shadowBlur = 5 * unit; f.shadowOffsetY = 4 * unit;
        f.drawImage(this.rocks[i % this.rocks.length], -r, -r, r * 2, r * 1.7);
        f.restore();
      }
      const plants = scene.plants === 'alpine' ? 18 : scene.plants === 'fern' ? 24 : 42;
      for (let i = 0; i < plants; i++) {
        const px = cx + (random() - .5) * extent * .9, py = cy + (random() - .5) * H * .68;
        const length = (18 + random() * 44) * unit, lean = (side ? -1 : 1) * (7 + random() * 27) * unit;
        f.strokeStyle = scene.foliage[i % 3]; f.fillStyle = scene.foliage[i % 3]; f.lineWidth = (.7 + random() * .6) * unit;
        f.beginPath(); f.moveTo(px, py); f.quadraticCurveTo(px + lean * .4, py - length * .6, px + lean, py - length); f.stroke();
        if (scene.plants === 'fern') {
          // Paired tapering leaflets make a fern, rather than generic strands of grass.
          for (let j = 1; j < 8; j++) {
            const t = j / 8, x = px + lean * t * t, y = py - length * t;
            const leaf = length * .2 * Math.sin(t * Math.PI);
            for (const direction of [-1, 1]) {
              f.beginPath(); f.moveTo(x, y);
              f.quadraticCurveTo(x + leaf * direction, y + leaf * .25, x + leaf * direction, y - leaf * .55);
              f.quadraticCurveTo(x + leaf * .4 * direction, y - leaf * .25, x, y); f.fill();
            }
          }
        } else if (scene.plants === 'reed' && i % 3 === 0) {
          f.strokeStyle = '#64513b'; f.lineWidth = 3 * unit; f.lineCap = 'round';
          f.beginPath(); f.moveTo(px + lean, py - length); f.lineTo(px + lean * 1.04, py - length - 8 * unit); f.stroke(); f.lineCap = 'butt';
        } else if (scene.plants === 'autumn') {
          f.save(); f.translate(px + lean, py - length); f.rotate(random() * 6.28);
          f.beginPath(); f.moveTo(0, -5 * unit); f.bezierCurveTo(7 * unit, -2 * unit, 5 * unit, 5 * unit, 0, 8 * unit); f.bezierCurveTo(-5 * unit, 3 * unit, -6 * unit, -1 * unit, 0, -5 * unit); f.fill(); f.restore();
        }
      }
      if (scene.plants === 'autumn') {
        for (let i = 0; i < 18; i++) {
          const x = side ? W - random() * W * .045 : random() * W * .045, y = random() * H;
          f.save(); f.translate(x, y); f.rotate(random() * 6.28); f.fillStyle = scene.foliage[i % 3]; f.globalAlpha = .8;
          f.beginPath(); f.ellipse(0, 0, 4 * unit, 2 * unit, 0, 0, Math.PI * 2); f.fill(); f.restore();
        }
      }
    }
  }
  burst(x, y, time) { this.bursts.push({ x, y, time }); }
  photoWater(wave, time, level, running,photo) {
    const w = this.off.width, h = this.off.height, data = this.image.data, field = wave.h;
    const normalX = this.normalX, normalY = this.normalY;
    for (let y = 1; y < 127; y++) for (let x = 1; x < 127; x++) {
      const p = y * 128 + x;
      normalX[p] = running ? field[p + 1] - field[p - 1] : 0; normalY[p] = running ? field[p + 128] - field[p - 128] : 0;
    }
    const v = this.view,mask=photoMask(this.theme,photo);
    for (let y = 0; y < h; y++) {
      const gy = (y / h * this.height - v.y) / v.height * 128, iy = Math.floor(gy), fy = gy - iy;
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4, gx = (x / w * this.width - v.x) / v.width * 128, ix = Math.floor(gx), fx = gx - ix;
        let nx = 0, ny = 0;
        if (ix > 0 && ix < 126 && iy > 0 && iy < 126) {
          const c = iy * 128 + ix;
          nx = mix(mix(normalX[c], normalX[c + 1], fx), mix(normalX[c + 128], normalX[c + 129], fx), fy);
          ny = mix(mix(normalY[c], normalY[c + 1], fx), mix(normalY[c + 128], normalY[c + 129], fx), fy);
        }
        const light = nx * .7 + ny * .9;
        const shimmer = this.reduced ? 0 : Math.max(0,this.sines[(x*11+y*5-time*350)&2047]*this.sines[(y*13-x*4+time*220)&2047])*.018;
        // The physical wave solver reflects from rocks; the light pass must
        // respect the same silhouette so a highlight cannot cross dry stone.
        const dry=level.rocks.some(r=>((gx-r.x)/(r.rx*1.05))**2+((gy-r.y)/(r.ry*1.05))**2<1);
        const mx=Math.max(0,Math.min(mask.width-1,Math.round(gx/128*mask.width)));
        const my=Math.max(0,Math.min(mask.height-1,Math.round(gy/128*mask.height)));
        const waterAlpha=dry?0:mask.alpha[my*mask.width+mx]/255;
        if (light >= 0) {
          data[p] = 223; data[p + 1] = 245; data[p + 2] = 238;
          data[p + 3] = waterAlpha*clamp(light * 4.2 + shimmer, 0, .23) * 255;
        } else {
          data[p] = 4; data[p + 1] = 39; data[p + 2] = 47;
          data[p + 3] = waterAlpha*clamp(-light * 2.7, 0, .16) * 255;
        }
      }
    }
    this.octx.putImageData(this.image, 0, 0);
  }
  water(wave, time) {
    const w = this.off.width, h = this.off.height, data = this.image.data, field = wave.h, v = this.view;
    const sx = this.width / w, sy = this.height / h, invX = C.size / v.width, invY = C.size / v.height, d = this.details, ref = this.reflection;
    const t = this.reduced ? 0 : time, sines = this.sines, phase = t * 76, phase2 = t * 53, clarity = this.theme.scene.clarity;
    // Interpolate all four normal samples, not just one axis: the fixed
    // physical grid must not leave stair steps in the rendered highlights.
    const normalX = this.normalX, normalY = this.normalY;
    for (let y = 1; y < 127; y++) for (let x = 1; x < 127; x++) { const p = y * 128 + x; normalX[p] = field[p + 1] - field[p - 1]; normalY[p] = field[p + 128] - field[p - 128]; }
    for (let y = 0; y < h; y++) {
      const gy = (y * sy - v.y) * invY, iy = Math.floor(gy), fy = gy - iy;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, j = i * 6, p = i * 4, k = i * 3;
        const gx = (x * sx - v.x) * invX, ix = Math.floor(gx), fx = gx - ix;
        let nx = 0, ny = 0, height = 0;
        if (ix >= 0 && ix < 127 && iy >= 0 && iy < 127) {
          const c = iy * 128 + ix;
          const a = mix(field[c], field[c + 1], fx), b = mix(field[c + 128], field[c + 129], fx);
          height = mix(a, b, fy);
          nx = mix(mix(normalX[c], normalX[c + 1], fx), mix(normalX[c + 128], normalX[c + 129], fx), fy);
          ny = mix(mix(normalY[c], normalY[c + 1], fx), mix(normalY[c + 128], normalY[c + 129], fx), fy);

        }
        const wind1 = sines[(d[j + 4] + phase) & 2047];
        const wind2 = sines[(d[j + 5] - phase2) & 2047];
        const wind3 = sines[(d[j + 4] * 2.17 + d[j + 5] * .28 + phase * 1.3) & 2047];
        const ambient = wind1 * .58 + wind2 * .3 + wind3 * .12;
        const normal = nx * .7 + ny * .9;
        const light = clamp(normal * C.render.normalGain, -24, 32) + ambient * 2.7 + wind1 * wind2;
        const rx = Math.max(0, Math.min(w - 1, Math.round(x + nx * 85 + wind1 * 1.1)));
        const ry = Math.max(0, Math.min(h - 1, Math.round(y + ny * 85 + wind2 * 1.5)));
        const ri = (ry * w + rx) * 3, bi = (ry * w + rx) * 4;
        const shallow = d[j + 2], glitter = Math.max(0, ambient + normal * 2 - .57) ** 2 * 50 * d[j + 3];
        const reflectionMix = .98 - shallow * clarity * .7;
        const caustic = this.caustics[ry * w + rx] * (19 + wind3 * 5) + Math.max(0, 1 - Math.abs(wind1 + wind2 * .6) * 5) ** 2 * shallow * clarity * 3;
        const crest = clamp(height * 16, -.7, .7);
        data[p] = mix(this.bed[bi] * .73, ref[ri], reflectionMix) + light + glitter + crest + caustic;
        data[p + 1] = mix(this.bed[bi + 1] * .91, ref[ri + 1], reflectionMix) + light + glitter + crest + caustic;
        data[p + 2] = mix(this.bed[bi + 2] * .85, ref[ri + 2], reflectionMix) + light * 1.02 + glitter + caustic;
        data[p + 3] = 255;
      }
    }
    this.octx.putImageData(this.image, 0, 0);
  }
  draw(wave, level, stones, lit, time, running, hints = [], hover = null) {
    if (this.cachedTheme !== this.theme || this.rocksVersion !== artVersion) { this.buildScene(); this.rocksVersion = artVersion; }
    const photo = lakeImage(this.theme);
    const activeRipples = !!photo;
    if (activeRipples) this.photoWater(wave, time,level,running&&wave.stepNumber>0,photo);
    else if (!photo) this.water(wave, time);
    const ctx = this.ctx, W = this.width, H = this.height, v = this.view, scale = v.size / C.size;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const art = photo ? `${artURL(this.theme.art)}:${this.timeOfDay}` : '';
    if (this.displayedArt !== art) {
      this.canvas.style.backgroundImage = art ? `${this.timeOfDay==='night'?'linear-gradient(#0419278c,#072139a3)':'linear-gradient(to bottom, transparent 65%, #15263248)'}, url("${artURL(this.theme.art)}")` : '';
      this.displayedArt = art;
    }
    this.canvas.style.backgroundSize = `100% 100%, ${v.width}px ${v.height}px`;
    this.canvas.style.backgroundPosition = `0 0, ${v.x}px ${v.y}px`;
    if (activeRipples || !photo) ctx.drawImage(this.off, 0, 0, W, H);
    ctx.save();
    if (this.zoom && !this.reduced) { const z = 1 + this.zoom * .014; ctx.translate(v.x + v.width / 2, v.y + v.height / 2); ctx.scale(z, z); ctx.translate(-v.x - v.width / 2, -v.y - v.height / 2); }
    ctx.translate(v.x, v.y); ctx.scale(v.width / C.size, v.height / C.size);
    if (!running && level.clearance) for (const l of level.lanterns) {
      ctx.beginPath();ctx.arc(l.x,l.y,level.clearance,0,Math.PI*2);ctx.setLineDash([.75,1.1]);
      ctx.strokeStyle='#092a35a8';ctx.lineWidth=.48;ctx.stroke();
      ctx.strokeStyle='#fff9dfdc';ctx.lineWidth=.22;ctx.stroke();ctx.setLineDash([]);
    }
    for (let i = 0; i < level.rocks.length; i++) {
      const r = level.rocks[i];
      ctx.save();ctx.translate(r.x,r.y);ctx.fillStyle='#061e2485';ctx.beginPath();ctx.ellipse(.35,.65,r.rx*1.04,r.ry*1.05,-.08,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=this.timeOfDay==='night'?'#a3c5ce58':'#dcf1e772';ctx.lineWidth=.13;ctx.setLineDash([.65,1.3]);ctx.beginPath();ctx.ellipse(0,.12,r.rx*1.065,r.ry*1.07,-.08,.15,Math.PI-.12);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      ctx.save(); ctx.translate(r.x, r.y);
      ctx.shadowColor = '#091d1bb0'; ctx.shadowBlur = 5 * this.dpr; ctx.shadowOffsetX = 1.5 * this.dpr; ctx.shadowOffsetY = 3 * this.dpr;
      ctx.drawImage(boulder.complete && boulder.naturalWidth ? boulder : this.rocks[(i + 2) % this.rocks.length], -r.rx * 1.16, -r.ry * 1.16, r.rx * 2.32, r.ry * 2.32); ctx.restore();
    }
    for (const p of hints) { ctx.strokeStyle = '#f1e5c49e'; ctx.lineWidth = .28; ctx.setLineDash([.7, 1]); ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (hover && !running && hover.x >= 7 && hover.x <= 121 && hover.y >= 7 && hover.y <= 121) {
      ctx.strokeStyle = hover.keyboard ? '#fff4d9' : hover.valid ? '#e8e9e187' : '#e4bdac77'; ctx.lineWidth = hover.keyboard ? .45 : .17; ctx.beginPath(); ctx.ellipse(hover.x, hover.y, 3, 3, 0, 0, Math.PI * 2); ctx.stroke();
      if(hover.keyboard) { ctx.beginPath(); ctx.moveTo(hover.x-5,hover.y);ctx.lineTo(hover.x+5,hover.y);ctx.moveTo(hover.x,hover.y-5);ctx.lineTo(hover.x,hover.y+5);ctx.stroke(); }
    }
    stones.forEach((stone, i) => {
      const age = (wave.stepNumber - (stone.delay || 0) * C.delaySteps) / C.delaySteps, sinking = running && age >= 0;
      const radius = Math.max(C.render.placedStoneRadius, C.render.stoneMinPixels / (2 * scale));
      ctx.save(); ctx.translate(stone.x, stone.y); ctx.scale(v.size / v.width, v.size / v.height);
      if (sinking) ctx.globalAlpha = clamp(1 - age * 3.5, 0, 1);
      ctx.fillStyle = '#12232c77'; ctx.beginPath(); ctx.ellipse(.5, .8, radius * .9, radius * .65, -.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle='#e9f7e795';ctx.lineWidth=.18;ctx.beginPath();ctx.ellipse(0,0,radius*1.08,radius*.83,-.2,0,Math.PI*2);ctx.stroke();
      ctx.rotate(-.4 + i * 1.2); ctx.drawImage(this.stoneFor(i), -radius, -radius, radius * 2, radius * 2); ctx.restore();
      if (sinking && age < .38 && !this.reduced) {
        ctx.save(); ctx.translate(stone.x, stone.y); ctx.scale(v.size / v.width, v.size / v.height); ctx.strokeStyle = `rgba(225,237,238,${(1 - age / .38) * .6})`; ctx.lineWidth = .18;
        ctx.beginPath(); ctx.arc(0, 0, .6 + age * 9, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < 9; k++) { const a = k * 2.3999, r = age * 12; ctx.fillStyle = `rgba(218,232,235,${clamp(1 - age / .32) * .7})`; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r - Math.sin(age / .38 * Math.PI) * 2, .12, .23, a, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
      }
    });
    level.lanterns.forEach((l, i) => this.lantern(ctx, l, lit[i], time, i, wave));
    this.bursts = this.bursts.filter(b => time - b.time < 1.4);
    if (!this.reduced) for (const b of this.bursts) {
      const age = time - b.time; ctx.strokeStyle = `rgba(242,218,166,${(1 - age / 1.4) * .24})`; ctx.lineWidth = .2; ctx.beginPath(); ctx.arc(b.x, b.y, 3 + age * 11, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore(); if (!photo) ctx.drawImage(this.foreground, 0, 0, W, H);
    if (!photo) { const shade = ctx.createLinearGradient(0, H * .65, 0, H); shade.addColorStop(0, '#15263200'); shade.addColorStop(1, '#15263248'); ctx.fillStyle = shade; ctx.fillRect(0, H * .65, W, H * .35); }
    // Draw timing labels in CSS pixels: projecting the lake must not squash its text.
    if (level.number >= C.delayUnlock) {
      const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) * .875;
      const zoom = this.zoom && !this.reduced ? 1 + this.zoom * .014 : 1;
      const label = (stone, above) => {
        const text = `${stone.delay || 0}s`;
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
        const width = ctx.measureText(text).width + 12, height = fontSize + 8;
        const x = clamp(v.x + v.width/2 + (stone.x/C.size-.5)*v.width*zoom, width/2+2, W-width/2-2);
        const offset = Math.max(C.render.placedStoneRadius*scale, C.render.stoneMinPixels/2) + height/2 + 4;
        const y = clamp(v.y + v.height/2 + (stone.y/C.size-.5)*v.height*zoom + (above ? -offset : offset), height/2+2, H-height/2-2);
        ctx.fillStyle = '#1b2c33'; ctx.beginPath(); ctx.roundRect(x-width/2,y-height/2,width,height,6); ctx.fill();
        ctx.fillStyle = above ? '#e7c58f' : '#eef3ef'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,x,y);
      };
      ctx.save();
      hints.forEach(stone=>label(stone,true));
      stones.filter(stone=>!running || wave.stepNumber<(stone.delay||0)*C.delaySteps).forEach(stone=>label(stone,false));
      ctx.restore();
    }
  }
  lantern(ctx, l, on, time, i, wave) {
    if (this.reduced) time = 0;
    const bob = this.reduced ? 0 : Math.sin(time * 1.2 + i * 1.7) * .13;
    ctx.save(); ctx.translate(l.x, l.y + bob);
    const objectScale = Math.max(1, C.render.lanternMinPixels / (5 * this.view.size / C.size)); ctx.scale(objectScale * this.view.size / this.view.width, objectScale * this.view.size / this.view.height);
    if (on) {
      const g = ctx.createRadialGradient(0, 0, .4, 0, 0, 12); g.addColorStop(0, '#edb65c57'); g.addColorStop(.25, '#d7aa5520'); g.addColorStop(1, '#dfb66700'); ctx.fillStyle = g; ctx.fillRect(-12, -12, 24, 24);
      // Broken amber reflections follow the surface, rather than a neon halo.
      for (let r = 0; r < 12; r++) { const dy = 2.5 + r * .55, wobble = Math.sin(time * 1.8 + r * 1.3) * .6; ctx.strokeStyle = `rgba(235,192,117,${(.22 - r * .016)})`; ctx.lineWidth = .27; ctx.beginPath(); ctx.moveTo(-1.3 + wobble, dy); ctx.lineTo(1.3 + wobble, dy); ctx.stroke(); }
    }
    ctx.fillStyle = '#14222c88'; ctx.beginPath(); ctx.ellipse(.3, .65, 2.75, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    const finish={bronze:['#b39b70','#685845','#3e3830'],reed:['#a3a575','#58674b','#303f34'],silver:['#d8e0db','#839399','#485c69'],firefly:['#cbb879','#806f46','#3b4032']}[this.cosmetics.lantern]||['#b39b70','#685845','#3e3830'];
    const wood = ctx.createLinearGradient(-2, -2, 2, 2); wood.addColorStop(0, finish[0]); wood.addColorStop(.45,finish[1]); wood.addColorStop(1,finish[2]);
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
