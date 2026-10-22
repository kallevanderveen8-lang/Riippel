import { C } from './config.js';
import { Wave, daySeed, cell, distance2 } from './simulation.js';
import { generate, canPlace } from './levels.js';
import { SCRIPTED } from './scripted.js';
import { Renderer } from './renderer.js';
import { Sound } from './audio.js';
import { Portal } from './sdk.js';
import { parseProgress, totalStars, goals, complete, rollDay, chapter, spend, dailyRun, finishDaily } from './progress.js';

const $ = id => document.getElementById(id), canvas = $('pond'), sound = new Sound(), renderer = new Renderer(canvas);
let adPlaying = false, collectionPage = 0, adPaused = false, manualPause = false, hidden = document.hidden, touched = false, loading = false;
const portal = new Portal(state => {
  adPaused = state.busy; adPlaying = state.playing; $('app').inert = state.busy;
  $('ad-shield').hidden = !state.busy; $('ad-shield').textContent = state.playing ? 'Advertisement' : 'Advertisement loading…';
  syncPause(); refresh();
}, muted => { sound.portalMuted = muted; sound.sync(); refresh(); });
let progress = parseProgress(portal.read()), mode = 'campaign', dailyDay = daySeed(), dailyStage = 0;
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
function snapshot() { return { number: level.number, seed: level.seed, day: mode === 'daily' ? dailyDay : null, stage: dailyStage, stones, attempts, resetUsed, elapsed, hintCount, completed: phase === 'complete', result }; }
function save() {
  if (level) progress[mode] = snapshot();
  progress.muted = sound.muted;
  if (!portal.write(JSON.stringify(progress))) $('instruction').textContent = 'Saving is unavailable. You can keep playing.';
}
function paused() { return manualPause || hidden || adPaused || loading || $('collection-dialog').open || $('hint-dialog').open; }
function syncPause(visibilityOnly = false) {
  sound.paused = manualPause || hidden || adPlaying || loading || $('collection-dialog').open || $('hint-dialog').open; sound.sync();
  // The SDK tracks tab visibility itself. Local audio/physics still pause.
  if (!visibilityOnly) {
    if (manualPause || adPaused || loading || $('collection-dialog').open || $('hint-dialog').open || phase === 'complete') portal.stop(); else portal.start();
  }
  last = performance.now(); accumulator = 0;
}
function applyTheme() { const theme = C.themes[progress.theme]; renderer.theme = theme; sound.muted = progress.muted; sound.setTheme(theme); sound.sync(); document.documentElement.style.setProperty('--accent', theme.accent); $('theme-name').replaceChildren(document.createTextNode(theme.name), Object.assign(document.createElement('small'), { textContent: 'Your lake' })); $('footer-theme').textContent = theme.name.toUpperCase(); }
function setInstruction(text) { $('instruction').textContent = text; }
function defaultInstruction() {
  if (level.number === 1) return 'Place a stone near the lantern. Then drop it.';
  if (level.number === 2) return 'One stone. Two little lights. Find the middle.';
  if (level.number === 3) return 'Place outside the gold circles. Let two waves meet.';
  if (level.number === 7) return 'Rocks send your ripples back. Listen for the echo.';
  if (level.number >= C.delayUnlock) return 'Tap stone: delay 0 / 1 / 2 s. Drag outside to remove.';
  return 'Tap to place or remove · Drag to move · Let your waves meet';
}
async function enter(newMode = mode) {
  if (level) save(); loading = true; portal.setLoading(true); syncPause();
  mode = newMode; const saved = progress[mode];
  dailyDay = daySeed();
  dailyStage = mode === 'daily' ? (saved?.day === dailyDay ? Math.max(0, Math.min(C.dailyLength - 1, saved.stage || 0)) : dailyRun(progress, dailyDay).stage) : 0;
  const number = mode === 'daily' ? C.dailyLevels[dailyStage] : saved?.number || progress.level;
  const restore = saved && (mode !== 'daily' || saved.day === dailyDay);
  const seed = mode === 'daily' ? (Math.imul(dailyDay, 2654435761) + dailyStage * 7919) >>> 0 : number * 7919;
  level = await fetchLevel(number, seed, mode === 'daily'); wave = new Wave(level.rocks);
  stones = restore && Array.isArray(saved.stones) ? saved.stones.slice(0, level.limit).map(s => ({ x: Math.round(Number(s.x)), y: Math.round(Number(s.y)), delay: Math.max(0, Math.min(C.maxDelay, Math.floor(Number(s.delay) || 0))) })).filter((s,i,all) => Number.isFinite(s.x) && Number.isFinite(s.y) && canPlace(s, level, all.slice(0,i))) : [];
  lit = level.lanterns.map(() => false); attempts = restore ? Number(saved.attempts) || 0 : 0; resetUsed = restore ? !!saved.resetUsed : false;
  elapsed = restore ? Number(saved.elapsed) || 0 : 0; hintCount = restore ? Number(saved.hintCount) || 0 : 0; result = restore ? saved.result : null;
  phase = restore && saved.completed ? 'complete' : 'ready'; if (phase === 'complete') lit.fill(true);
  pointer = null; hover = null; celebration = 0; renderer.zoom = 0; renderer.bursts = []; loading = false; portal.setLoading(false);
  portal.context({ level: number, mode, dailyStage: mode === 'daily' ? dailyStage + 1 : 0 });
  applyTheme(); setInstruction(defaultInstruction()); refresh(); overlay(); syncPause(); save();
  if (mode === 'campaign') fetchLevel(number + 1).catch(() => {});
  if (mode === 'daily' && dailyStage + 1 < C.dailyLength) fetchLevel(C.dailyLevels[dailyStage + 1], (Math.imul(dailyDay,2654435761) + (dailyStage + 1) * 7919) >>> 0, true).catch(() => {});
}
function renderGoals(target) {
  const items = goals(progress); target.replaceChildren();
  items.forEach((g,i) => { const row = document.createElement('div'); row.className = `goal${progress.goals.claimed.includes(i) ? ' complete' : ''}`; const mark = document.createElement('span'); mark.className = 'check'; mark.textContent = progress.goals.claimed.includes(i) ? '✓' : ''; const label = document.createElement('span'); label.textContent = g.title; const small = document.createElement('small'); small.textContent = `${Math.min(g.target, g.value)} / ${g.target}`; label.append(small); row.append(mark, label); target.append(row); });
}
function refresh() {
  if (!level) return;
  const total = totalStars(progress), nextTheme = C.themes.find(t => t.unlock > total);
  $('level-label').textContent = mode === 'daily' ? `DAILY TRAIL · ${dailyStage + 1} / ${C.dailyLength}` : `LAKE ${String(level.number).padStart(2,'0')}`;
  $('level-name').textContent = level.name;
  const ch = chapter(level.number), done = Array.from({length:C.chapterLength}, (_,i) => !!progress.stars[`l${ch.first + i}`]).filter(Boolean).length;
  $('chapter-progress').textContent = mode === 'daily' ? `${new Date(dailyDay * 86400000).toISOString().slice(0,10)} · Same lakes for everyone` : `${ch.name} · ${done}/${C.chapterLength} lakes · +${C.chapterTokens} hints at chapter end`;
  $('app').classList.toggle('is-watching', phase === 'running' || phase === 'celebrate'); $('par').textContent = `PAR ${level.par}`;
  $('stones-left').textContent = level.limit - stones.length;
  $('stone-tray').replaceChildren(...Array.from({length:level.limit},(_,i)=>{const stone=document.createElement('i');stone.className='inventory-stone'+(i<stones.length?' used':'');return stone;})); $('lit-count').textContent = `${lit.filter(Boolean).length} / ${lit.length}`;
  $('attempt-label').textContent = attempts ? `Drop ${attempts}` : 'Take your time'; $('drop').disabled = !stones.length || phase !== 'ready' || paused(); $('reset').disabled = !stones.length || phase !== 'ready' || paused();
  $('total-stars').textContent = $('mobile-stars').textContent = total;
  $('next-theme').textContent = nextTheme ? `Next: ${nextTheme.name}` : 'All lakes unlocked'; $('unlock-count').textContent = nextTheme ? `${total} / ${nextTheme.unlock}` : '✧';
  $('theme-progress').style.width = `${nextTheme ? (total % C.themeStars) / C.themeStars * 100 : 100}%`;
  $('journey-number').textContent = `${String(level.number).padStart(2,'0')} / ∞`;
  $('journey').replaceChildren(...Array.from({length:10},(_,i) => { const dot = document.createElement('i'), n = Math.floor((level.number - 1) / 10) * 10 + i + 1; dot.className = n < progress.level ? 'done' : n === level.number ? 'current' : ''; return dot; }));
  $('chapter').textContent = level.number < 7 ? 'THE FIRST RIPPLES' : level.number < 15 ? 'WHERE ECHOES MEET' : 'A MOMENT IN TIME';
  $('daily').title = progress.level > C.dailyUnlock ? 'Play today’s shared lake' : 'Unlocks after lake 3';
  $('daily-title').textContent = progress.level > C.dailyUnlock ? `${progress.streak || 0} day streak` : 'A lake to share';
  $('daily-teaser').textContent = progress.level > C.dailyUnlock ? 'Three fresh lakes every UTC day. Finish the trail to grow your streak.' : 'Daily lake unlocks after lake 3.';
  $('sound').disabled = !!portal.muteAudio; $('sound').title = portal.muteAudio ? 'Muted by CrazyGames' : '';
  $('sound').textContent = sound.muted || portal.muteAudio ? '♪̸' : '♫'; $('sound').setAttribute('aria-label', sound.muted ? 'Unmute sound' : 'Mute sound');
  $('pond-tag').textContent = `${C.themes[progress.theme].name.toUpperCase()} · ${phase === 'running' ? 'IN MOTION' : phase === 'complete' ? 'ALIGHT' : 'STILL'}`;
  const ads = portal.eligible(), canDouble = !manualPause && phase === 'complete' && !progress.doubled[rewardKey()];
  $('hint').hidden = !(attempts >= C.hintFailures && phase === 'ready' && hintCount < level.solution.length);
  $('hint').textContent = `Hint · ${progress.tokens}`;
  $('hint-token').disabled = progress.tokens < 1; $('hint-token').textContent = `Use 1 hint · Reveal a stone (${progress.tokens} left)`;
  $('hint-ad').hidden = !(ads && attempts >= C.rewardedFailures);
  $('hint-free').hidden = !(attempts >= C.freeHelpFailures && progress.tokens < 1);
  $('double').hidden = !(ads && canDouble); $('double-token').hidden = !canDouble; $('double-token').disabled = progress.tokens < 2;
  const canReroll = !progress.goals.rerolled && !progress.goals.claimed.includes(0);
  $('reroll').hidden = !(ads && canReroll); $('reroll-token').hidden = !canReroll; $('reroll-token').disabled = progress.tokens < 1;
  $('token-balance').textContent = `${progress.tokens} hints saved · Earn one with each new lake`;
  $('daily').disabled = phase === 'running' || phase === 'celebrate' || adPaused || loading;
  $('themes').disabled = $('collection-mobile').disabled = phase === 'running' || phase === 'celebrate' || adPaused || loading;
  renderGoals($('goals'));
}
function overlay() {
  $('overlay').hidden = !manualPause && phase !== 'complete';
  if (manualPause) {
    $('overlay-kicker').textContent = 'A MOMENT OF STILLNESS'; $('reward-stars').textContent = ''; $('overlay-title').textContent = 'Take your time.'; $('overlay-text').textContent = 'Your lake will be here.'; $('next').textContent = 'Resume →'; $('copy').hidden = true; $('double').hidden = true; $('double-token').hidden = true; $('replay').hidden = true; return;
  }
  if (phase !== 'complete') return;
  $('replay').hidden = false; $('replay').textContent = (result?.stars || 3) < 3 ? `Try again · Aim for ${level.par} stones` : 'Replay · Beat your record';
  $('overlay-kicker').textContent = mode === 'daily' ? 'TODAY, TOGETHER' : 'A LAKE FULL OF LIGHT';
  $('reward-stars').textContent = '★'.repeat(result?.stars || 3) + '☆'.repeat(3 - (result?.stars || 3));
  $('overlay-title').textContent = result?.better ? 'Better than par!' : ['Beautifully done.', 'A little harmony.', 'Look what you started.'][level.number % 3];
  const detail = result?.chapterReward ? `Chapter complete · +${C.chapterBonus} stars & ${C.chapterTokens} hints` : result?.first ? '+1 hint saved for a harder lake' : result?.newRecord ? 'A new personal best.' : 'Best score kept. Try fewer stones.';
  const dailyDone = mode === 'daily' && dailyStage === C.dailyLength - 1;
  $('overlay-text').textContent = `${stones.length} stone${stones.length === 1 ? '' : 's'} · ${attempts} drop${attempts === 1 ? '' : 's'} · +${result?.gained || 0} stars\n${detail}${dailyDone ? `\nTrail complete · ${progress.streak} day streak · +${C.dailyTokens} hints on first finish` : mode === 'campaign' && level.number === 3 ? '\nDaily trail unlocked. Three new lakes every day.' : ''}`;
  $('next').textContent = mode === 'daily' ? (dailyDone ? 'Back to your journey →' : `Daily lake ${dailyStage + 2} →`) : 'Next lake →';
  $('copy').hidden = !dailyDone; $('copy').textContent = 'Copy daily result';

}
function rewardKey() { return mode === 'daily' ? `d${dailyDay}-${dailyStage}` : `l${level.number}`; }
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
  result = complete(progress, rewardKey(), stones.length, level.par, resetUsed, { attempts, elapsed });
  if (mode === 'campaign') { progress.level = Math.max(progress.level, level.number + 1); portal.milestone(progress.level - 1); }
  else finishDaily(progress, dailyDay, dailyStage, result, stones.length);
  portal.happy(); syncPause(); refresh(); overlay(); save();
  // Natural break only. A rewarded ad shares the same cooldown, so never chained.
  if (result.first) portal.ad('midgame', Object.keys(progress.stars).length).then(() => refresh());
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
    celebration += dt; for (let s = 0; s < C.stepsPerTick; s++) if (wave.stepNumber < C.visualTailSteps) wave.step();
    renderer.zoom = Math.max(0, 1 - celebration / C.winSeconds);
    if (celebration >= C.winSeconds) finishWin();
  } else if (phase === 'complete') {
    // Cosmetic continuation cannot change a score: lantern evaluation ends at win/360 steps.
    for (let s = 0; s < C.stepsPerTick; s++) if (wave.stepNumber < C.visualTailSteps) wave.step();
  }
}
function frame(now) {
  const dt = Math.min(C.maxFrameDelta, (now - last) / 1000); last = now;
  if (level && !paused()) { accumulator += dt; while (accumulator >= 1 / C.tickHz) { tick(1 / C.tickHz); accumulator -= 1 / C.tickHz; } }
  if (wave && level) {
    const tutorialHints = level.number >= 3 && level.number <= 5 && attempts >= C.hintFailures;
    const hints = phase === 'ready' ? level.solution.slice(0, tutorialHints ? level.solution.length : hintCount) : [];
    renderer.draw(wave, level, stones, lit, globalTime, phase === 'running' || phase === 'celebrate' || phase === 'complete', hints, hover);
    $('hint-finger').style.left = `${renderer.view.x + renderer.view.width / 2}px`; $('hint-finger').style.top = `${renderer.view.y + renderer.view.height / 2}px`;
    $('hint-finger').classList.toggle('visible', level.number === 1 && mode === 'campaign' && stones.length === 0 && elapsed > 5 && phase === 'ready' && !paused());
    if (debug) $('debug').textContent = `Ripple · ${mode}\nLake ${level.number} | ${phase}${paused() ? ' (paused)' : ''}\nAttempts ${attempts} | session drops ${drops}\nActive time ${elapsed.toFixed(1)} s\nGeneration ${level.generationMs.toFixed(1)} ms\nStep ${wave.stepNumber} / ${C.steps} | T ${C.threshold}\nPeaks ${level.lanterns.map(l => wave.peak[cell(l.x,l.y)].toFixed(4)).join(' / ')}\nFPS ~${Math.round(1 / Math.max(.001,dt))} | seed ${level.seed}`;
  }
  if (++frameCount % C.tickHz === 0) { rollDay(progress); refresh(); }
  requestAnimationFrame(frame);
}
function point(e) { return renderer.point(e.clientX, e.clientY); }
function edited() { wave.reset(); lit.fill(false); setInstruction(defaultInstruction()); touched = true; sound.place(); refresh(); save(); }
canvas.addEventListener('pointerdown', e => {
  if (!level || phase !== 'ready' || paused() || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); sound.unlock(); touched = true; const p = point(e), hitRadius = e.pointerType === 'touch' ? Math.max(C.touchRadius, 24 * C.size / renderer.view.size) : C.touchRadius;
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
  else if (!moved) setInstruction(stones.length >= level.limit ? 'No stones left. Move one, or tap it to remove.' : 'Place a stone in the open water near the lanterns.');
  pointer = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointercancel', () => { if (pointer?.index >= 0) stones[pointer.index] = pointer.original; pointer = null; refresh(); });
canvas.addEventListener('pointerleave', () => { hover = null; });
$('drop').onclick = drop;
$('reset').onclick = () => { if (phase !== 'ready' || paused()) return; stones = []; resetUsed = true; edited(); };
$('sound').onclick = () => { if (portal.muteAudio) return; sound.muted = !sound.muted; progress.muted = sound.muted; sound.unlock(); sound.sync(); save(); refresh(); };
$('pause').onclick = () => { if (adPaused || loading) return; manualPause = !manualPause; $('pause').setAttribute('aria-label', manualPause ? 'Resume game' : 'Pause game'); syncPause(); overlay(); refresh(); save(); };
$('next').onclick = async () => {
  if (adPaused || loading) return;
  if (manualPause) { manualPause = false; syncPause(); refresh(); overlay(); return; }
  if (phase !== 'complete') return;
  if (mode === 'daily') {
    if (dailyStage < C.dailyLength - 1 && daySeed() === dailyDay) { progress.daily = { day: dailyDay, stage: dailyStage + 1 }; level = null; await enter('daily'); }
    else await enter('campaign'); return;
  }
  const nextNumber = level.number + 1; progress.campaign = { number: nextNumber }; level = null; await enter('campaign');
};
$('daily').onclick = async () => {
  if (paused() || phase === 'running' || phase === 'celebrate') return;
  if (progress.level <= C.dailyUnlock) { setInstruction('Daily lake unlocks after lake 3. A little further…'); return; }
  await enter(mode === 'daily' ? 'campaign' : 'daily');
};
async function reward(action) {
  if (portal.busy) return;
  // Offers are only in paused dialogs or the result screen.
  const wasManual = manualPause; manualPause = true;
  $('hint-dialog').close(); $('collection-dialog').close(); syncPause();
  const success = await portal.ad('rewarded'); if (success) action();
  manualPause = wasManual; syncPause(); refresh(); overlay(); save();
  if (!success) setInstruction('No ad available. Your stones and hints are safe.');
}
function reveal() { hintCount = Math.min(level.solution.length, hintCount + 1); setInstruction('A faint ring marks one solution stone. Match its delay if shown.'); }
function doubleStars() { const key = rewardKey(); if (!result || progress.doubled[key]) return; progress.doubled[key] = true; progress.bonus += result.stars; result.gained += result.stars; }
function reroll() { progress.goals.rerolled = true; save(); refresh(); }
$('hint').onclick = () => { if (phase !== 'ready' || paused()) return; $('hint-dialog').showModal(); syncPause(); refresh(); };
$('hint-close').onclick = () => $('hint-dialog').close();
$('hint-dialog').addEventListener('close', () => { syncPause(); refresh(); });
$('hint-token').onclick = () => { if (spend(progress,1)) { reveal(); $('hint-dialog').close(); save(); refresh(); } };
$('hint-free').onclick = () => { if (attempts >= C.freeHelpFailures && progress.tokens < 1) { reveal(); $('hint-dialog').close(); save(); refresh(); } };
$('hint-ad').onclick = () => reward(reveal);
$('double').onclick = () => { if (!progress.doubled[rewardKey()] && phase === 'complete') reward(doubleStars); };
$('double-token').onclick = () => { if (phase === 'complete' && !progress.doubled[rewardKey()] && spend(progress,2)) { doubleStars(); save(); refresh(); overlay(); } };
$('reroll').onclick = () => reward(reroll);
$('reroll-token').onclick = () => { if (!progress.goals.rerolled && spend(progress,1)) reroll(); };
$('replay').onclick = async () => {
  if (phase !== 'complete' || adPaused) return;
  progress[mode] = { number:level.number, day:dailyDay, stage:dailyStage }; level = null; await enter();
};
$('dock').onclick = () => { const top = $('app').classList.toggle('dock-top'); $('dock').textContent = top ? 'Controls ↓' : 'Controls ↑'; $('dock').setAttribute('aria-label', `Move controls to the ${top ? 'bottom' : 'top'}`); };
$('copy').onclick = async () => {
  const record = progress.dailyResults[dailyDay] || {stars:result.stars,stones:stones.length};
  const text = `Ripple Daily #${dailyDay} · ${record.stars}/${C.dailyLength * 3} stars · ${record.stones} stones · ${C.dailyLength}/${C.dailyLength} lakes 🔆🔆🔆`;
  try { await navigator.clipboard.writeText(text); $('copy').textContent = 'Copied ✓'; }
  catch { const area = document.createElement('textarea'); area.value = text; area.style.cssText = 'position:fixed;left:0;top:0;opacity:.01'; document.body.append(area); area.select(); const ok = document.execCommand('copy'); area.remove(); $('copy').textContent = ok ? 'Copied ✓' : text; }
};
function openCollection() {
  if (phase === 'running' || phase === 'celebrate' || adPaused) return;
  const target = $('theme-options'); target.replaceChildren();
  C.themes.forEach((theme,i) => { const b = document.createElement('button'); b.textContent = `${theme.name} ${i === progress.theme ? '✓' : totalStars(progress) < theme.unlock ? `· ${theme.unlock} stars` : '→'}`; b.disabled = totalStars(progress) < theme.unlock; b.onclick = () => { progress.theme = i; applyTheme(); save(); openCollection(); }; target.append(b); });
  renderLakeList();
  if (!$('collection-dialog').open) $('collection-dialog').showModal(); syncPause(); refresh();

}
function renderLakeList() {
  const first = collectionPage * C.chapterLength + 1;
  $('lake-page').textContent = `${first}–${first + C.chapterLength - 1} · ${chapter(first).name}`;
  $('page-back').disabled = collectionPage === 0; $('page-next').disabled = first + C.chapterLength > progress.level;
  $('lake-list').replaceChildren(...Array.from({length:C.chapterLength}, (_,i) => {
    const number = first + i, b = document.createElement('button'), mark = document.createElement('small');
    b.textContent = number; b.disabled = number > progress.level;
    const stars = progress.stars[`l${number}`] || 0; mark.textContent = b.disabled ? 'Locked' : '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const record = progress.records[`l${number}`]; b.title = record ? `Best: ${record.stones} stones, ${record.attempts} drops` : `Lake ${number}`;
    b.append(mark); b.onclick = async () => { save(); progress.campaign = {number}; level = null; $('collection-dialog').close(); manualPause = false; await enter('campaign'); }; return b;
  }));
}
$('page-back').onclick = () => { collectionPage = Math.max(0, collectionPage - 1); renderLakeList(); };
$('page-next').onclick = () => { collectionPage = Math.min(Math.floor((progress.level - 1) / C.chapterLength), collectionPage + 1); renderLakeList(); };
$('themes').onclick = openCollection;
$('collection-mobile').onclick = () => { collectionPage = chapter(level.number).index; openCollection(); };
$('close-dialog').onclick = () => $('collection-dialog').close(); $('collection-dialog').addEventListener('close', () => { syncPause(); refresh(); });
document.addEventListener('visibilitychange', () => { hidden = document.hidden; save(); syncPause(true); }); window.addEventListener('pagehide',save);
document.addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); debug = !debug; $('debug').hidden = !debug; } if (e.code === 'Space' && e.target === canvas) { e.preventDefault(); drop(); } });

requestAnimationFrame(frame); await enter();
portal.init().then(async () => {
  if (portal.sdk?.data) {
    const cloud = portal.initialData;
    if (cloud && !touched) { progress = parseProgress(cloud); level = null; await enter(); }
    else if (cloud) { const remote = parseProgress(cloud); for (const [key,value] of Object.entries(remote.stars)) progress.stars[key] = Math.max(progress.stars[key] || 0, value); progress.level = Math.max(progress.level,remote.level); progress.bonus = Math.max(progress.bonus,remote.bonus); progress.doubled = {...remote.doubled,...progress.doubled}; progress.dailyResults = {...remote.dailyResults,...progress.dailyResults}; progress.chapters = {...remote.chapters,...progress.chapters}; progress.records = {...remote.records,...progress.records}; progress.tokens = Math.max(progress.tokens,remote.tokens); if (remote.lastDaily > progress.lastDaily) { progress.lastDaily = remote.lastDaily; progress.streak = remote.streak; } }
    portal.acceptData(); save();
  }
  portal.context({ level:level.number, mode }); syncPause(); refresh();
});
// Explicit test-only harness; production URL exposes no solution controls.
if (new URLSearchParams(location.search).has('test')) window.__ripple = {
  get state() { return {mode,dailyDay,dailyStage,view:renderer.view,level,stones,lit,phase,attempts,progress,elapsed,paused:paused(),step:wave.stepNumber}; },
  solve() { stones = level.solution.map(s=>({...s})); edited(); drop(); },
  place(value) { stones = value; edited(); }, drop,
  async go(number) { progress.campaign = {number}; level = null; await enter('campaign'); },
  daily: () => { progress.level = Math.max(4,progress.level); return enter('daily'); },
  portal, sound, refresh, save,
};
