import { C } from './config.js';
import { Wave, daySeed, cell, distance2 } from './simulation.js';
import { generate, canPlace } from './levels.js';
import { SCRIPTED } from './scripted.js';
import { Renderer } from './renderer.js';
import { Sound } from './audio.js';
import { Portal } from './sdk.js';
import { parseProgress, totalStars, goals, complete, rollDay } from './progress.js';

const $ = id => document.getElementById(id), canvas = $('pond'), sound = new Sound(), renderer = new Renderer(canvas);
let adPaused = false, manualPause = false, hidden = document.hidden, touched = false, loading = false;
const portal = new Portal(paused => { adPaused = paused; syncPause(); refresh(); });
let progress = parseProgress(portal.read()), mode = 'campaign', dailyDay = daySeed();
let level, wave, stones = [], lit = [], phase = 'ready', attempts = 0, resetUsed = false, elapsed = 0, result = null, celebration = 0, hintCount = 0;
let globalTime = 0, last = performance.now(), accumulator = 0, hover = null, pointer = null, debug = false, drops = 0, frameCount = 0;
let worker, requestId = 0; const pending = new Map(), cache = new Map();
try {
  worker = new Worker(new URL('./generator-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({data}) => { const p = pending.get(data.id); if (!p) return; pending.delete(data.id); if (data.error) p.reject(new Error(data.error)); else p.resolve(data.level); };
  worker.onerror = () => { for (const p of pending.values()) p.reject(new Error('Worker unavailable')); pending.clear(); worker.terminate(); worker = null; };
} catch { worker = null; }
function fetchLevel(number, seed = number * 7919, daily = false) {
  if (!daily && number <= SCRIPTED.length) return Promise.resolve(structuredClone(SCRIPTED[number - 1]));
  const key = `${number}:${seed}:${daily}`;
  if (!cache.has(key)) cache.set(key, new Promise((resolve, reject) => {
    if (worker) { const id = ++requestId; pending.set(id, { resolve, reject }); worker.postMessage({ id, number, seed, daily }); }
    else setTimeout(() => { try { resolve(generate(number, seed, daily)); } catch(e) { reject(e); } }, 0);
  }).catch(() => generate(number, seed, daily)));
  return cache.get(key);
}
function snapshot() { return { number: level.number, seed: level.seed, day: mode === 'daily' ? dailyDay : null, stones, attempts, resetUsed, elapsed, hintCount, completed: phase === 'complete', result }; }
function save() {
  if (level) progress[mode] = snapshot();
  progress.muted = sound.muted;
  if (!portal.write(JSON.stringify(progress))) $('instruction').textContent = 'Saving is unavailable. You can keep playing.';
}
function paused() { return manualPause || hidden || adPaused || loading || $('collection-dialog').open; }
function syncPause() {
  sound.paused = paused() || phase === 'complete'; sound.sync();
  if (paused() || phase === 'complete') portal.stop(); else portal.start();
  last = performance.now(); accumulator = 0;
}
function applyTheme() { const theme = C.themes[progress.theme]; renderer.theme = theme; sound.muted = progress.muted; sound.setTheme(theme); sound.sync(); document.documentElement.style.setProperty('--accent', theme.accent); $('theme-name').replaceChildren(document.createTextNode(theme.name), Object.assign(document.createElement('small'), { textContent: 'Your pond' })); $('footer-theme').textContent = theme.name.toUpperCase(); }
function setInstruction(text) { $('instruction').textContent = text; }
function defaultInstruction() {
  if (level.number === 1) return 'Tap to place a stone, then DROP';
  if (level.number === 2) return 'One stone. Two little lights. Find the middle.';
  if (level.number === 3) return 'Place outside the gold circles. Let two waves meet.';
  if (level.number === 7) return 'Rocks send your ripples back. Listen for the echo.';
  if (level.number >= C.delayUnlock) return 'Tap stone: delay 0 / 1 / 2 s. Drag outside to remove.';
  return 'Tap to place or remove · Drag to move · Let your waves meet';
}
async function enter(newMode = mode) {
  if (level) save(); loading = true; syncPause();
  mode = newMode; const saved = progress[mode];
  dailyDay = daySeed();
  const number = mode === 'daily' ? 22 : saved?.number || progress.level;
  const restore = saved && (mode !== 'daily' || saved.day === dailyDay);
  const seed = mode === 'daily' ? Math.imul(dailyDay, 2654435761) >>> 0 : number * 7919;
  level = await fetchLevel(number, seed, mode === 'daily'); wave = new Wave(level.rocks);
  stones = restore && Array.isArray(saved.stones) ? saved.stones.slice(0, level.limit).map(s => ({ x: Math.round(Number(s.x)), y: Math.round(Number(s.y)), delay: Math.max(0, Math.min(C.maxDelay, Math.floor(Number(s.delay) || 0))) })).filter((s,i,all) => Number.isFinite(s.x) && Number.isFinite(s.y) && canPlace(s, level, all.slice(0,i))) : [];
  lit = level.lanterns.map(() => false); attempts = restore ? Number(saved.attempts) || 0 : 0; resetUsed = restore ? !!saved.resetUsed : false;
  elapsed = restore ? Number(saved.elapsed) || 0 : 0; hintCount = restore ? Number(saved.hintCount) || 0 : 0; result = restore ? saved.result : null;
  phase = restore && saved.completed ? 'complete' : 'ready'; if (phase === 'complete') lit.fill(true);
  pointer = null; hover = null; celebration = 0; renderer.zoom = 0; renderer.bursts = []; loading = false;
  applyTheme(); setInstruction(defaultInstruction()); refresh(); overlay(); syncPause(); save();
  if (mode === 'campaign') fetchLevel(number + 1).catch(() => {});
  if (progress.level > C.dailyUnlock) fetchLevel(22, Math.imul(daySeed(), 2654435761) >>> 0, true).catch(() => {});
}
function renderGoals(target) {
  const items = goals(progress); target.replaceChildren();
  items.forEach((g,i) => { const row = document.createElement('div'); row.className = `goal${progress.goals.claimed.includes(i) ? ' complete' : ''}`; const mark = document.createElement('span'); mark.className = 'check'; mark.textContent = progress.goals.claimed.includes(i) ? '✓' : ''; const label = document.createElement('span'); label.textContent = g.title; const small = document.createElement('small'); small.textContent = `${Math.min(g.target, g.value)} / ${g.target}`; label.append(small); row.append(mark, label); target.append(row); });
}
function refresh() {
  if (!level) return;
  const total = totalStars(progress), nextTheme = C.themes.find(t => t.unlock > total);
  $('level-label').textContent = mode === 'daily' ? `DAILY POND · ${new Date(dailyDay * 86400000).toISOString().slice(0,10)}` : `POND ${String(level.number).padStart(2,'0')}`;
  $('level-name').textContent = level.name; $('par').textContent = `PAR ${level.par}`;
  $('stones-left').textContent = level.limit - stones.length; $('lit-count').textContent = `${lit.filter(Boolean).length} / ${lit.length}`;
  $('attempt-label').textContent = attempts ? `Drop ${attempts}` : 'Take your time'; $('drop').disabled = !stones.length || phase !== 'ready' || paused(); $('reset').disabled = !stones.length || phase !== 'ready' || paused();
  $('total-stars').textContent = $('mobile-stars').textContent = total;
  $('next-theme').textContent = nextTheme ? `Next: ${nextTheme.name}` : 'All ponds unlocked'; $('unlock-count').textContent = nextTheme ? `${total} / ${nextTheme.unlock}` : '✧';
  $('theme-progress').style.width = `${nextTheme ? (total % C.themeStars) / C.themeStars * 100 : 100}%`;
  $('journey-number').textContent = `${String(level.number).padStart(2,'0')} / ∞`;
  $('journey').replaceChildren(...Array.from({length:10},(_,i) => { const dot = document.createElement('i'), n = Math.floor((level.number - 1) / 10) * 10 + i + 1; dot.className = n < progress.level ? 'done' : n === level.number ? 'current' : ''; return dot; }));
  $('chapter').textContent = level.number < 7 ? 'THE FIRST RIPPLES' : level.number < 15 ? 'WHERE ECHOES MEET' : 'A MOMENT IN TIME';
  $('daily').title = progress.level > C.dailyUnlock ? 'Play today’s shared pond' : 'Unlocks after pond 3';
  $('daily-title').textContent = progress.level > C.dailyUnlock ? `${progress.streak || 0} day streak` : 'A pond to share';
  $('daily-teaser').textContent = progress.level > C.dailyUnlock ? 'One new pond. Everyone, together.' : 'Daily pond unlocks after pond 3.';
  $('sound').textContent = sound.muted ? '♪̸' : '♫'; $('sound').setAttribute('aria-label', sound.muted ? 'Unmute sound' : 'Mute sound');
  $('pond-tag').textContent = `${C.themes[progress.theme].name.toUpperCase()} · ${phase === 'running' ? 'IN MOTION' : phase === 'complete' ? 'ALIGHT' : 'STILL'}`;
  const ads = portal.eligible(); $('hint').hidden = !(ads && attempts >= C.rewardedFailures && phase === 'ready' && hintCount < level.solution.length);
  $('double').hidden = !(ads && phase === 'complete' && !progress.doubled[rewardKey()]);
  $('reroll').hidden = !(ads && !progress.goals.rerolled && !progress.goals.claimed.includes(0));
  $('daily').disabled = phase === 'running' || phase === 'celebrate' || adPaused || loading;
  $('themes').disabled = $('collection-mobile').disabled = phase === 'running' || phase === 'celebrate' || adPaused || loading;
  renderGoals($('goals'));
}
function overlay() {
  $('overlay').hidden = !manualPause && phase !== 'complete';
  if (manualPause) {
    $('overlay-kicker').textContent = 'A MOMENT OF STILLNESS'; $('reward-stars').textContent = ''; $('overlay-title').textContent = 'Take your time.'; $('overlay-text').textContent = 'Your pond will be here.'; $('next').textContent = 'Resume →'; $('copy').hidden = true; $('double').hidden = true; return;
  }
  if (phase !== 'complete') return;
  $('overlay-kicker').textContent = mode === 'daily' ? 'TODAY, TOGETHER' : 'A POND FULL OF LIGHT';
  $('reward-stars').textContent = '★'.repeat(result?.stars || 3) + '☆'.repeat(3 - (result?.stars || 3));
  $('overlay-title').textContent = result?.better ? 'Better than par!' : ['Beautifully done.', 'A little harmony.', 'Look what you started.'][level.number % 3];
  $('overlay-text').textContent = `${stones.length} stone${stones.length === 1 ? '' : 's'} · ${attempts} drop${attempts === 1 ? '' : 's'} · +${result?.gained || 0} stars${mode === 'daily' ? `\n${progress.streak} day streak. See you tomorrow.` : level.number === 3 ? '\nDaily pond is now unlocked. A new pond, every day.' : '\nAnother quiet discovery awaits.'}`;
  $('next').textContent = mode === 'daily' ? 'Back to your journey →' : 'Next pond →'; $('copy').hidden = mode !== 'daily';
}
function rewardKey() { return mode === 'daily' ? `d${dailyDay}` : `l${level.number}`; }
function drop() {
  if (phase !== 'ready' || paused() || !stones.length) return;
  touched = true; attempts++; drops++; phase = 'running'; wave.reset(stones); lit.fill(false); sound.unlock(); sound.splash();
  setInstruction('Watch what a little wave can do.'); $('hint-finger').classList.remove('visible'); refresh(); save();
}
function win() {
  phase = 'celebrate'; celebration = 0; renderer.zoom = 1; sound.chime(lit.length);
}
function finishWin() {
  phase = 'complete'; renderer.zoom = 0;
  result = complete(progress, rewardKey(), stones.length, level.par, resetUsed, mode === 'daily' ? dailyDay : null);
  if (mode === 'campaign') progress.level = Math.max(progress.level, level.number + 1);
  portal.happy(); syncPause(); refresh(); overlay(); save();
  // Natural break only. A rewarded ad shares the same cooldown, so never chained.
  portal.ad('midgame', Object.keys(progress.stars).length).then(() => refresh());
}
function tick(dt) {
  globalTime += dt; if (phase === 'ready' || phase === 'running') elapsed += dt;
  if (phase === 'running') {
    for (let s = 0; s < C.stepsPerTick; s++) {
      wave.step();
      level.lanterns.forEach((l,i) => { if (!lit[i] && wave.peak[cell(l.x,l.y)] >= C.threshold) { lit[i] = true; renderer.burst(l.x,l.y,globalTime); sound.chime(lit.filter(Boolean).length - 1); refresh(); } });
      if (lit.every(Boolean)) { win(); break; }
      if (wave.stepNumber >= C.steps) {
        phase = 'ready';
        const hint = level.number >= 3 && level.number <= 5 && attempts >= C.hintFailures;
        setInstruction(hint ? 'Two waves meeting make a BIG wave. Try the faint rings.' : `${lit.filter(Boolean).length} of ${lit.length} lit. Move a stone and try again.`);
        refresh(); save(); break;
      }
    }
  } else if (phase === 'celebrate') {
    celebration += dt; if (Math.floor(celebration * C.tickHz) % 3 === 0 && wave.stepNumber < C.steps) wave.step();
    renderer.zoom = Math.max(0, 1 - celebration / C.winSeconds);
    if (celebration >= C.winSeconds) finishWin();
  }
}
function frame(now) {
  const dt = Math.min(C.maxFrameDelta, (now - last) / 1000); last = now;
  if (level && !paused()) { accumulator += dt; while (accumulator >= 1 / C.tickHz) { tick(1 / C.tickHz); accumulator -= 1 / C.tickHz; } }
  if (wave) {
    const tutorialHints = level.number >= 3 && level.number <= 5 && attempts >= C.hintFailures;
    const hints = phase === 'ready' ? level.solution.slice(0, tutorialHints ? level.solution.length : hintCount) : [];
    renderer.draw(wave, level, stones, lit, globalTime, phase === 'running' || phase === 'celebrate', hints, hover);
    $('hint-finger').classList.toggle('visible', level.number === 1 && mode === 'campaign' && stones.length === 0 && elapsed > 5 && phase === 'ready' && !paused());
    if (debug) $('debug').textContent = `Ripple · ${mode}\nPond ${level.number} | ${phase}${paused() ? ' (paused)' : ''}\nAttempts ${attempts} | session drops ${drops}\nActive time ${elapsed.toFixed(1)} s\nGeneration ${level.generationMs.toFixed(1)} ms\nStep ${wave.stepNumber} / ${C.steps} | T ${C.threshold}\nPeaks ${level.lanterns.map(l => wave.peak[cell(l.x,l.y)].toFixed(4)).join(' / ')}\nFPS ~${Math.round(1 / Math.max(.001,dt))} | seed ${level.seed}`;
  }
  if (++frameCount % C.tickHz === 0) { rollDay(progress); refresh(); }
  requestAnimationFrame(frame);
}
function point(e) { const r = canvas.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left) / r.width * C.size), y: Math.round((e.clientY - r.top) / r.height * C.size) }; }
function edited() { wave.reset(); lit.fill(false); setInstruction(defaultInstruction()); touched = true; sound.place(); refresh(); save(); }
canvas.addEventListener('pointerdown', e => {
  if (!level || phase !== 'ready' || paused() || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); sound.unlock(); touched = true; const p = point(e), hitRadius = e.pointerType === 'touch' ? Math.max(C.touchRadius, 24 * C.size / canvas.getBoundingClientRect().width) : C.touchRadius;
  let index = -1, nearest = hitRadius ** 2; stones.forEach((s,i) => { const d = distance2(p,s); if (d <= nearest) { index = i; nearest = d; } });
  pointer = { id: e.pointerId, start: p, index, original: index >= 0 ? {...stones[index]} : null, moved: false }; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  const p = point(e); if (!level) return;
  hover = { ...p, valid: canPlace(p,level,stones,pointer?.index ?? -1) };
  if (!pointer || pointer.id !== e.pointerId) return;
  if (distance2(p, pointer.start) > C.dragThreshold ** 2) pointer.moved = true;
  if (pointer.moved && pointer.index >= 0 && canPlace(p,level,stones,pointer.index)) { stones[pointer.index] = { ...p, delay: pointer.original.delay }; wave.reset(); lit.fill(false); }
});
canvas.addEventListener('pointerup', e => {
  if (!pointer || e.pointerId !== pointer.id) return;
  const p = point(e), { index, moved } = pointer;
  if (index >= 0) {
    if (moved) { if (p.x < 0 || p.y < 0 || p.x >= C.size || p.y >= C.size) stones.splice(index,1); }
    else if (level.number >= C.delayUnlock) stones[index].delay = ((stones[index].delay || 0) + 1) % (C.maxDelay + 1);
    else stones.splice(index,1);
    edited();
  } else if (!moved && stones.length < level.limit && canPlace(p,level,stones)) { stones.push({ ...p, delay:0 }); edited(); }
  else if (!moved) setInstruction(stones.length >= level.limit ? 'No stones left. Move one, or tap it to remove.' : 'Try open water outside the gold circles and rocks.');
  pointer = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointercancel', () => { if (pointer?.index >= 0) stones[pointer.index] = pointer.original; pointer = null; refresh(); });
canvas.addEventListener('pointerleave', () => { hover = null; });
$('drop').onclick = drop;
$('reset').onclick = () => { if (phase !== 'ready' || paused()) return; stones = []; resetUsed = true; edited(); };
$('sound').onclick = () => { sound.muted = !sound.muted; progress.muted = sound.muted; sound.unlock(); sound.sync(); save(); refresh(); };
$('pause').onclick = () => { if (adPaused || loading) return; manualPause = !manualPause; $('pause').setAttribute('aria-label', manualPause ? 'Resume game' : 'Pause game'); syncPause(); overlay(); refresh(); save(); };
$('next').onclick = async () => {
  if (adPaused || loading) return;
  if (manualPause) { manualPause = false; syncPause(); refresh(); overlay(); return; }
  if (phase !== 'complete') return;
  if (mode === 'daily') { await enter('campaign'); return; }
  const nextNumber = level.number + 1; progress.campaign = { number: nextNumber }; level = null; await enter('campaign');
};
$('daily').onclick = async () => {
  if (paused() || phase === 'running' || phase === 'celebrate') return;
  if (progress.level <= C.dailyUnlock) { setInstruction('Daily pond unlocks after pond 3. A little further…'); return; }
  await enter(mode === 'daily' ? 'campaign' : 'daily');
};
async function reward(action) { if (portal.busy) return; const success = await portal.ad('rewarded'); if (success) action(); else setInstruction('No ad available right now. Your pond is ready.'); refresh(); overlay(); save(); }
$('hint').onclick = () => reward(() => { hintCount = Math.min(level.solution.length,hintCount + 1); setInstruction('A faint ring marks one solution stone.'); });
$('double').onclick = () => { const key = rewardKey(); if (progress.doubled[key]) return; reward(() => { if (progress.doubled[key]) return; progress.doubled[key] = true; progress.bonus += result.stars; result.gained += result.stars; }); };
$('reroll').onclick = () => reward(() => { progress.goals.rerolled = true; progress.goals.solves = []; });
$('copy').onclick = async () => {
  const record = progress.dailyResults[dailyDay] || {stars:result.stars,stones:stones.length};
  const text = `Ripple #${dailyDay} ${'⭐'.repeat(record.stars)} ${record.stones} stones ${'🔆'.repeat(level.lanterns.length)}`;
  try { await navigator.clipboard.writeText(text); $('copy').textContent = 'Copied ✓'; }
  catch { const area = document.createElement('textarea'); area.value = text; area.style.cssText = 'position:fixed;left:0;top:0;opacity:.01'; document.body.append(area); area.select(); const ok = document.execCommand('copy'); area.remove(); $('copy').textContent = ok ? 'Copied ✓' : text; }
};
function openCollection() {
  if (phase === 'running' || phase === 'celebrate' || adPaused) return;
  const target = $('theme-options'); target.replaceChildren();
  C.themes.forEach((theme,i) => { const b = document.createElement('button'); b.textContent = `${theme.name} ${i === progress.theme ? '✓' : totalStars(progress) < theme.unlock ? `· ${theme.unlock} stars` : '→'}`; b.disabled = totalStars(progress) < theme.unlock; b.onclick = () => { progress.theme = i; applyTheme(); save(); openCollection(); }; target.append(b); });
  renderGoals($('mobile-goals')); if (portal.eligible() && !progress.goals.rerolled && !progress.goals.claimed.includes(0)) { const reroll = document.createElement('button'); reroll.className = 'text-button'; reroll.textContent = '▷ Watch ad · Free goal reroll'; reroll.onclick = () => { $('collection-dialog').close(); $('reroll').click(); }; $('mobile-goals').append(reroll); } if (!$('collection-dialog').open) $('collection-dialog').showModal(); syncPause(); refresh();
}
$('themes').onclick = $('collection-mobile').onclick = openCollection;
$('close-dialog').onclick = () => $('collection-dialog').close(); $('collection-dialog').addEventListener('close', () => { syncPause(); refresh(); });
document.addEventListener('visibilitychange', () => { hidden = document.hidden; save(); syncPause(); }); window.addEventListener('pagehide',save);
document.addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); debug = !debug; $('debug').hidden = !debug; } if (e.code === 'Space' && e.target === canvas) { e.preventDefault(); drop(); } });

requestAnimationFrame(frame); await enter();
portal.init().then(async () => {
  if (portal.sdk?.data) {
    const cloud = portal.read();
    if (cloud && !touched) { progress = parseProgress(cloud); level = null; await enter(); }
    else if (cloud) { const remote = parseProgress(cloud); for (const [key,value] of Object.entries(remote.stars)) progress.stars[key] = Math.max(progress.stars[key] || 0, value); progress.level = Math.max(progress.level,remote.level); progress.bonus = Math.max(progress.bonus,remote.bonus); progress.doubled = {...remote.doubled,...progress.doubled}; progress.dailyResults = {...remote.dailyResults,...progress.dailyResults}; if (remote.lastDaily > progress.lastDaily) { progress.lastDaily = remote.lastDaily; progress.streak = remote.streak; } }
    save();
  }
  syncPause(); refresh();
});
// Explicit test-only harness; production URL exposes no solution controls.
if (new URLSearchParams(location.search).has('test')) window.__ripple = {
  get state() { return {level,stones,lit,phase,attempts,progress,elapsed,paused:paused(),step:wave.stepNumber}; },
  solve() { stones = level.solution.map(s=>({...s})); edited(); drop(); },
  place(value) { stones = value; edited(); }, drop,
  async go(number) { progress.campaign = {number}; level = null; await enter('campaign'); },
  daily: () => { progress.level = Math.max(4,progress.level); return enter('daily'); },
  portal, sound, refresh, save,
};
