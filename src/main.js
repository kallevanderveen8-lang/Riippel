import { C, lakeForLevel } from './config.js';
import { Wave, daySeed, cell, distance2 } from './simulation.js';
import { generate, canPlace, levelName } from './levels.js';
import { SCRIPTED } from './scripted.js';
import { CURATED } from './curated.js';
import { Renderer } from './renderer.js';
import { Sound } from './audio.js';
import { Portal } from './sdk.js';
import { parseProgress, totalStars, goals, complete, rollDay, masteryTarget, discoveries, readyDiscoveries, claimDiscovery, lightForLake, setLakeLight, claimDailyGift, buyCosmetic, equipCosmetic, spend, buyNextLake, dailyRun, finishDaily } from './progress.js';

const $ = id => document.getElementById(id), canvas = $('pond'), sound = new Sound(), renderer = new Renderer(canvas);
const iconPaths = {
  'arrow-right':'M5 12h14m-6-6 6 6-6 6', 'arrow-left':'M19 12H5m6-6-6 6 6 6', close:'m6 6 12 12M18 6 6 18',
  reset:'M4 10a8 8 0 1 1 1 7M4 4v6h6', undo:'M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12h-3', journal:'M5 3h12a2 2 0 0 1 2 2v16H6a3 3 0 0 1 0-6h13M5 3v12m4-8h6m-6 4h4',
  calendar:'M7 3v4m10-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1m3 9h2m4 0h2m-8 3h2',
  star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9h6m-6 6h6m-3-8v10',
  sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  award:'M16.5 8a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0M8.5 12 7 21l5-3 5 3-1.5-9',
  lake:'M8 7c0-5 8-5 8 0s-8 5-8 0M6 12c-5 2-2 6 6 6s11-4 6-6M4 16c-5 3 0 6 8 6s13-3 8-6',
  move:'M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4', help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 9a3 3 0 1 1 4 2.8c-1 .4-1 1-1 2.2m0 3h.01',
  play:'m8 4 12 8-12 8Z', pause:'M8 5v14M16 5v14', check:'m5 12 4 4L19 6',
  lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z', drop:'M12 3v10m-4-4 4 4 4-4M6 15c-5 2-2 6 6 6s11-4 6-6',
  question:'M9 8a3 3 0 1 1 4 2.8c-1 .4-1 1.2-1 2.2m0 4h.01',
  controller:'M7 7h10c3 0 4 3 4 7l-1 5h-3l-3-3h-4l-3 3H4l-1-5c0-4 1-7 4-7Zm0 3v5m-2-2.5h4m6-.5h.01m3 2h.01',
  ripple:'M11 3h2m-1 2v3M9 11c-4 1-3 5 3 5s7-4 3-5M6 13c-7 3-4 8 6 8s13-5 6-8',
  lantern:'M8 5a4 4 0 0 1 8 0M6 6h12v14H6Zm6 4v6M4 21h16', chevron:'m6 9 6 6 6-6',
  settings:'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'
};
function icon(name, className='') {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class',`icon ${className}`.trim());svg.setAttribute('aria-hidden','true');path.setAttribute('d',iconPaths[name]);svg.append(path);return svg;
}
function action(id,text,name,leading=false) { const label=document.createElement('span');label.textContent=text;$(id).replaceChildren(...(leading?[icon(name),label]:[label,icon(name)])); }
for(const placeholder of document.querySelectorAll('[data-icon]'))placeholder.replaceChildren(icon(placeholder.dataset.icon));
let adPlaying = false, collectionPage = 0, adPaused = false, manualPause = false, hidden = document.hidden, touched = false, loading = false;
const portal = new Portal(state => {
  adPaused = state.busy; adPlaying = state.playing; $('app').inert = state.busy;
  $('ad-shield').hidden = !state.busy; $('ad-shield').textContent = state.playing ? 'Advertisement' : 'Advertisement loading…';
  syncPause(); refresh();
}, muted => { sound.portalMuted = muted; sound.sync(); refresh(); });
let progress = parseProgress(portal.read()), mode = progress.mode, dailyDay = daySeed(), dailyStage = 0;
let level, wave, stones = [], lit = [], phase = 'ready', attempts = 0, resetUsed = false, elapsed = 0, result = null, celebration = 0, hintCount = 0;
let globalTime = 0, last = performance.now(), accumulator = 0, hover = null, pointer = null, debug = false, drops = 0, frameCount = 0;
let journalTab = 'lakes', keyboardPoint = {x:64,y:64}, tutorialActive = false;
let undoStack=[],lastPlacement=[];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function revealPanel(element) {
  element.getAnimations().forEach(animation=>animation.cancel());
  if (!reducedMotion.matches && !progress.preferences.reducedMotion) element.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'});
}
let worker, requestId = 0; const pending = new Map(), cache = new Map();
try {
  worker = new Worker(new URL('./generator-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({data}) => { const p = pending.get(data.id); if (!p) return; pending.delete(data.id); if (data.error) p.reject(new Error(data.error)); else p.resolve(data.level); };
  worker.onerror = () => { for (const p of pending.values()) p.reject(new Error('Worker unavailable')); pending.clear(); worker.terminate(); worker = null; };
} catch { worker = null; }
function fetchLevel(number, seed = number * 7919, daily = false, legacy = false) {
  if (!daily && number <= SCRIPTED.length) return Promise.resolve(structuredClone(SCRIPTED[number - 1]));
  if (!daily && !legacy && number>=11 && number<=30 && seed===number*7919) return Promise.resolve({...structuredClone(CURATED[number-11]),generationMs:0});
  const key = `${number}:${seed}:${daily}:${legacy}`;
  if (!cache.has(key)) cache.set(key, new Promise((resolve, reject) => {
    if (worker) { const id = ++requestId; pending.set(id, { resolve, reject }); worker.postMessage({ id, number, seed, daily, legacy }); }
    else setTimeout(() => { try { resolve(generate(number, seed, daily, legacy)); } catch(e) { reject(e); } }, 0);
  }).catch(() => generate(number, seed, daily, legacy)));
  return cache.get(key);
}
function snapshot() { return { number: level.number, seed: level.seed, generatorVersion: level.generatorVersion || 2, day: mode === 'daily' ? dailyDay : null, stage: dailyStage, stones, attempts, resetUsed, elapsed, hintCount, completed: phase === 'complete', result }; }
function save() {
  if (level) progress[mode] = snapshot();
  progress.mode = mode; progress.muted = sound.muted;
  if (!portal.write(JSON.stringify(progress))) setInstruction('Saving is unavailable. You can keep playing.',true);
}
function dialogOpen() { return !!document.querySelector('dialog[open]'); }
function paused() { return manualPause || hidden || adPaused || loading || dialogOpen(); }
function syncPause(visibilityOnly = false) {
  if (paused()) cancelPointer();
  sound.paused = hidden || adPlaying || loading;
  sound.inMenu = manualPause || dialogOpen() || phase === 'complete'; sound.sync();
  // The SDK tracks tab visibility itself. Local audio/physics still pause.
  if (!visibilityOnly) {
    if (manualPause || adPaused || loading || dialogOpen() || phase === 'complete') portal.stop(); else portal.start();
  }
  last = performance.now(); accumulator = 0;
}
function activeLakeNumber() { return mode === 'daily' ? progress.level : level?.number || progress.level; }
function applyTheme() {
  const lake=lakeForLevel(activeLakeNumber()), theme=lake.theme, light=lightForLake(progress,activeLakeNumber());
  renderer.theme=theme; renderer.timeOfDay=light; renderer.cosmetics=progress.cosmetics;
  sound.muted=progress.muted; sound.setTheme(theme); sound.sync();
  document.documentElement.style.setProperty('--accent',theme.accent);
  document.documentElement.style.setProperty('--menu-scene',`url("${renderer.thumbnail(theme)}")`);
  $('theme-name').textContent=lake.name; $('theme-description').textContent=theme.description;
  $('light-lake-range').textContent=`LEVELS ${String(lake.first).padStart(2,'0')}–${String(lake.last).padStart(2,'0')}`;
  $('light-preview').src=renderer.thumbnail(theme); $('light-preview').classList.toggle('night',light==='night');
  for(const button of $('theme-options').querySelectorAll('button')) button.setAttribute('aria-pressed',String(button.dataset.light===light));
}
function applyPreferences() {
  const preferences = progress.preferences;
  sound.ambientEnabled = preferences.ambientSound; sound.musicEnabled = preferences.musicEnabled; sound.sync();
  renderer.setReducedMotion(preferences.reducedMotion);
  document.documentElement.classList.toggle('user-reduced-motion',preferences.reducedMotion);
  document.documentElement.classList.toggle('user-high-contrast',preferences.highContrast);
  $('app').classList.toggle('dock-top',preferences.dockTop);
  action('dock',preferences.dockTop?'Move toolbar down':'Move toolbar up','move',true);
  $('dock').setAttribute('aria-label',`Move controls to the ${preferences.dockTop?'bottom':'top'}`);
  $('setting-motion').checked = preferences.reducedMotion;
  $('setting-ambience').checked = preferences.ambientSound;
  $('setting-music').checked = preferences.musicEnabled;
  $('setting-contrast').checked = preferences.highContrast;
  $('setting-dock').checked = preferences.dockTop;
}
let feedbackTimer;
function setInstruction(text, visible = false, persistent = false) {
  if ($('instruction').textContent !== text) $('instruction').textContent = text;
  clearTimeout(feedbackTimer);
  $('feedback').hidden = !visible;
  if (visible) {
    $('feedback').textContent = text;
    revealPanel($('feedback'));
    if (!persistent) feedbackTimer = setTimeout(()=>{ $('feedback').hidden = true; },4200);
  }
}
let inventoryTheme, inventorySkin, inventoryArtVersion = -1, previousLit = 0;
function renderInventory() {
  const tray = $('stone-tray');
  if (tray.children.length !== level.limit || inventoryTheme !== renderer.theme || inventorySkin !== progress.cosmetics.stone || inventoryArtVersion !== renderer.artVersion) {
    tray.replaceChildren(...Array.from({length:level.limit},(_,i)=>{const stone=document.createElement('i');stone.className='inventory-stone';stone.style.backgroundImage=`url("${renderer.stonePreview(i)}")`;return stone;}));
    inventoryTheme = renderer.theme;
    inventorySkin = progress.cosmetics.stone;
    inventoryArtVersion = renderer.artVersion;
  }
  [...tray.children].forEach((stone,i)=>stone.classList.toggle('used',i<stones.length));
  const remaining = level.limit - stones.length;
  $('stones-left').textContent = remaining; $('stones-unit').textContent = remaining === 1 ? 'stone' : 'stones';
  const count = lit.filter(Boolean).length, label = `${count} / ${lit.length}`;
  if ($('lit-count').textContent !== label) $('lit-count').textContent = label;
  if (count > previousLit && !reducedMotion.matches && !progress.preferences.reducedMotion) $('lantern-status').animate([{color:'#f5d298',filter:'drop-shadow(0 0 5px #dfbd8066)'},{color:'#e8e5d7',filter:'drop-shadow(0 0 0 transparent)'}],{duration:280,easing:'ease-out'});
  previousLit = count;
}
// Stack the toolbar only when its measured content would meet a corner control.
// This also handles enlarged text without relying on a phone breakpoint.
const hudObserver = new ResizeObserver(()=>{
  const toolbar=document.querySelector('.play-controls').getBoundingClientRect(), footer=document.querySelector('footer').getBoundingClientRect();
  const sides=[document.querySelector('.footer-tools'),document.querySelector('.pond-status')].map(e=>e.getBoundingClientRect().width);
  $('app').classList.toggle('compact-hud',toolbar.width+2*Math.max(...sides)+32>footer.width);
  $('app').style.setProperty('--footer-height',`${footer.height}px`);
  $('app').style.setProperty('--header-bottom',`${document.querySelector('header').getBoundingClientRect().bottom+12}px`);
});
for (const element of document.querySelectorAll('header,footer,.play-controls,.footer-tools,.pond-status')) hudObserver.observe(element);
function defaultInstruction() {
  if (level.number === 1) return 'Place a stone near the lantern. Then drop it.';
  if (level.number === 2) return 'One stone can light both lanterns. Find the middle.';
  if (level.number === 3) return 'Place outside the dashed rings. Let two waves meet at the lantern.';
  if (level.number === 7) return 'Waves reflect from rocks. Use the returning ripples to light the lanterns.';
  if (level.number >= C.delayUnlock) return 'Click a placed stone to delay its drop. Time waves to meet.';
  return 'Click to place · Drag to move · Right-click to remove';
}
function updateTutorialTip() {
  const visible = tutorialActive && level?.number === 1 && mode === 'campaign' && phase === 'ready' && !manualPause && !dialogOpen();
  $('tutorial-tip').hidden = !visible;
  $('tutorial-target').hidden = !visible || (stones.length > 0 && attempts === 0);
  $('drop').classList.toggle('tutorial-highlight',visible && stones.length > 0);
  if (!visible) return;
  const retry = attempts > 0;
  $('tutorial-tip').dataset.stage = retry ? 'retry' : stones.length ? 'drop' : 'place';
  $('tutorial-step').textContent = retry ? 'TRY AGAIN' : stones.length ? 'STEP 2 OF 2' : 'STEP 1 OF 2';
  $('tutorial-title').textContent = retry ? 'Follow the quiet ring.' : stones.length ? 'Now drop your stone.' : 'Place a stone.';
  $('tutorial-copy').textContent = retry ? 'Move your stone into the marked water, then drop it again.' : stones.length ? 'Press Drop stones and watch the ripple reach the lantern.' : 'Click the open water inside the ring.';
  const target = level.solution[0] || {x:64,y:64};
  $('tutorial-target').style.left = `${target.x / C.size * 100}%`;
  $('tutorial-target').style.top = `${target.y / C.size * 100}%`;
}
function finishTutorial() {
  if (!tutorialActive) return;
  tutorialActive = false; progress.tutorialDone = true;
  $('tutorial-tip').hidden = $('tutorial-target').hidden = true;
  $('drop').classList.remove('tutorial-highlight');
}
function maybeShowWelcome() {
  if (level?.number !== 1 || mode !== 'campaign') {
    tutorialActive = false; $('tutorial-tip').hidden = $('tutorial-target').hidden = true;
    if ($('welcome-dialog').open) $('welcome-dialog').close();
    return;
  }
  if (progress.tutorialDone || progress.stars.l1) { if ($('welcome-dialog').open) $('welcome-dialog').close(); finishTutorial(); return; }
  if (phase !== 'ready' || tutorialActive || dialogOpen()) return;
  $('welcome-dialog').showModal(); revealPanel($('welcome-dialog')); syncPause(); refresh();
}
async function enter(newMode = mode) {
  if (level) save(); loading = true; $('loading-status').hidden = false; portal.setLoading(true); syncPause();
  mode = newMode; const saved = progress[mode];
  dailyDay = daySeed();
  dailyStage = mode === 'daily' ? (saved?.day === dailyDay && !saved.completed ? Math.max(0, Math.min(C.dailyLength - 1, saved.stage || 0)) : dailyRun(progress, dailyDay).stage) : 0;
  const number = mode === 'daily' ? C.dailyLevels[dailyStage] : saved?.number || progress.level;
  const restore = saved && (mode !== 'daily' || saved.day === dailyDay && saved.stage === dailyStage);
  const seed = mode === 'daily' ? (Math.imul(dailyDay, 2654435761) + dailyStage * 7919) >>> 0 : number * 7919;
  const legacy = !!(restore && saved.seed !== undefined && (saved.generatorVersion ?? 1) === 1 && number > SCRIPTED.length);
  level = await fetchLevel(number, seed, mode === 'daily', legacy); level.generatorVersion = legacy ? 1 : 2; wave = new Wave(level.rocks);
  wave.peakIndices = level.lanterns.map(l => cell(l.x,l.y));
  stones = restore && Array.isArray(saved.stones) ? saved.stones.slice(0, level.limit).map(s => ({ x: Math.round(Number(s.x)), y: Math.round(Number(s.y)), delay: Math.max(0, Math.min(C.maxDelay, Math.floor(Number(s.delay) || 0))) })).filter((s,i,all) => Number.isFinite(s.x) && Number.isFinite(s.y) && canPlace(s, level, all.slice(0,i))) : [];
  lit = level.lanterns.map(() => false); attempts = restore ? Number(saved.attempts) || 0 : 0; resetUsed = restore ? !!saved.resetUsed : false;
  elapsed = restore ? Number(saved.elapsed) || 0 : 0; hintCount = restore ? Number(saved.hintCount) || 0 : 0; result = restore ? saved.result : null;
  phase = restore && saved.completed ? 'complete' : 'ready'; if (phase === 'complete') lit.fill(true);
  undoStack=[];lastPlacement=stones.map(s=>({...s}));
  pointer = null; hover = null; keyboardPoint = {x:64,y:64}; celebration = 0; renderer.zoom = 0; renderer.resetCamera(); renderer.bursts = []; renderer.failure = null; loading = false; $('loading-status').hidden = true; portal.setLoading(false);
  portal.context({ level: number, mode, dailyStage: mode === 'daily' ? dailyStage + 1 : 0 });
  const newMechanic = mode === 'campaign' && [2,3,7,C.delayUnlock].includes(number) && !progress.stars[`l${number}`] && attempts === 0 && stones.length === 0 && phase === 'ready';
  applyTheme(); applyPreferences(); setInstruction(defaultInstruction(),newMechanic,newMechanic); refresh(); overlay(); syncPause(); save(); maybeShowWelcome();
  if (mode === 'campaign') {
    fetchLevel(number + 1).catch(() => {});
    const nextLake=lakeForLevel(number+1);
    if(nextLake.group!==lakeForLevel(number).group)renderer.preloadLake(nextLake.theme);
    if(number===6)renderer.preloadBoulder();
  }
  if (mode === 'daily' && dailyStage + 1 < C.dailyLength) fetchLevel(C.dailyLevels[dailyStage + 1], (Math.imul(dailyDay,2654435761) + (dailyStage + 1) * 7919) >>> 0, true).catch(() => {});
}
function renderGoals(target) {
  const items = goals(progress); target.replaceChildren();
  items.forEach((g,i) => { const row = document.createElement('div'); row.className = `goal${progress.goals.claimed.includes(i) ? ' complete' : ''}`; const mark = document.createElement('span'); mark.className = 'check'; if(progress.goals.claimed.includes(i))mark.append(icon('check')); const label = document.createElement('span'); label.textContent = g.title; const small = document.createElement('small'); small.textContent = `${Math.min(g.target, g.value)} / ${g.target}`; label.append(small); row.append(mark, label); target.append(row); });
}
function renderDiscoveries() {
  const items = discoveries(progress).sort((a,b)=>Number(b.ready)-Number(a.ready)||Number(a.earned)-Number(b.earned)||a.target-b.target), target = $('discoveries'); target.replaceChildren();
  $('discovery-count').textContent = `${items.filter(d=>d.earned).length}/${items.length} claimed${items.some(d=>d.ready)?` · ${items.filter(d=>d.ready).length} ready`:''}`;
  $('jump-keepsakes').classList.toggle('has-reward',items.some(d=>d.ready));
  for (const d of items) {
    const card = document.createElement('div'); card.className = `discovery${d.earned ? ' earned' : ''}${d.ready?' ready':''}`;card.dataset.discovery=d.id;card.tabIndex=-1;
    if (Number.isInteger(d.postcard)) { const image=document.createElement('img');image.className='postcard-art';image.src=renderer.thumbnail(lakeForLevel(d.postcard*C.lakeLength+1).theme);image.alt='';card.append(image); }
    const title = document.createElement('strong'); title.textContent = d.name;
    const detail = document.createElement('span'); detail.textContent = d.detail;
    const meter = document.createElement('progress'); meter.max = d.target; meter.value = Math.min(d.target,d.value); meter.setAttribute('aria-label',d.detail);
    const caption = document.createElement('small'); caption.textContent = `${Math.min(d.target,d.value)} / ${d.target}${d.earned?' · Claimed':d.ready?'':` · +${d.reward} coins`}`;
    card.append(icon(d.earned?'check':d.ready?'award':'lake'),title,detail,meter,caption);
    if(d.ready){const claim=document.createElement('button');claim.className='claim-milestone primary';claim.textContent=`Claim · +${d.reward} coins`;claim.onclick=()=>{
      const reward=claimDiscovery(progress,d.id);if(!reward)return;
      save();refresh();renderDiscoveries();
      const earned=target.querySelector(`[data-discovery="${d.id}"]`);earned?.focus({preventScroll:true});
      if(earned&&!reducedMotion.matches&&!progress.preferences.reducedMotion)earned.animate([
        {transform:'scale(.96)',boxShadow:'0 0 0 0 #f2d99a00'},
        {transform:'scale(1.025)',boxShadow:'0 0 0 6px #f2d99a55',offset:.5},
        {transform:'scale(1)',boxShadow:'0 0 0 0 #f2d99a00'}
      ],{duration:560,easing:'ease-out'});
      showRewardToast(reward.name,`+${reward.reward} coins`);
    };card.append(claim);}
    target.append(card);
  }
}
let shopPreviewGeneration=0;
function renderShop() {
  const target=$('shop-items'),previews=[],generation=++shopPreviewGeneration;target.replaceChildren();
  for(const [kind,label] of [['stones','Stones'],['lanterns','Lanterns']]) {
    const group=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('div');
    group.className='shop-group';heading.textContent=label;grid.className='shop-grid';group.append(heading,grid);
    for(const item of C.cosmetics[kind].filter(item=>!item.unlockLevel || item.unlockLevel<=progress.level+10)) {
      const owned=progress.cosmetics[kind].includes(item.id),selected=progress.cosmetics[kind==='stones'?'stone':'lantern']===item.id;
      const locked=progress.level<(item.unlockLevel||1);
      const card=document.createElement('div'),image=document.createElement('img'),meta=document.createElement('div'),name=document.createElement('strong'),type=document.createElement('small'),button=document.createElement('button');
      card.className='shop-card';card.dataset.item=item.id;card.classList.toggle('equipped',selected);card.classList.toggle('locked',locked);card.classList.toggle('collector',item.kind==='Collector');
      image.alt='';image.loading='lazy';
      const cached=renderer.cachedCosmeticPreview(kind,item.id);
      if(cached)image.src=cached;
      else {
        image.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        previews.push(()=>{if(image.isConnected)image.src=renderer.cosmeticPreview(kind,item.id);});
      }
      name.textContent=item.name;type.textContent=locked?`${item.kind} · ${item.cost} coins`:item.kind;meta.append(name,type);
      button.textContent=selected?'Equipped':owned?'Equip':locked?`Level ${item.unlockLevel}`:`${item.cost} coins`;
      button.disabled=selected||locked||(!owned&&progress.tokens<item.cost);button.setAttribute('aria-label',`${selected?'Equipped':owned?'Equip':locked?`Unlocks at level ${item.unlockLevel}`:`Buy for ${item.cost} coins`}: ${item.name}`);
      button.onclick=()=>{
        const success=owned?equipCosmetic(progress,kind,item.id):buyCosmetic(progress,kind,item.id);
        if(!success)return;
        renderer.cosmetics=progress.cosmetics;save();refresh();renderShop();
        target.querySelector(`[data-item="${item.id}"] button`)?.focus({preventScroll:true});
        showRewardToast(item.name,owned?'Equipped':`Purchased · ${item.cost} coins`);
      };
      card.append(image,meta,button);grid.append(card);
    }
    target.append(group);
  }
  if(previews.length) {
    let next=0;
    const fill=()=>{
      if(generation!==shopPreviewGeneration || journalTab!=='shop' || !$('collection-dialog').open)return;
      previews[next++]();
      if(next<previews.length)schedule();
    };
    const schedule=()=>typeof requestIdleCallback==='function'?requestIdleCallback(fill,{timeout:200}):setTimeout(fill,24);
    schedule();
  }
}
let rewardToastTimer;
function showRewardToast(title,detail,playSound=true) {
  const toast=$('reward-toast');clearTimeout(rewardToastTimer);
  if(playSound){sound.unlock();sound.reward();}
  $('reward-toast-title').textContent=title;$('reward-toast-detail').textContent=detail;
  toast.hidden=false;toast.getAnimations().forEach(animation=>animation.cancel());
  if(!reducedMotion.matches&&!progress.preferences.reducedMotion) toast.animate([{opacity:0,transform:'translate(-50%,12px) scale(.96)'},{opacity:1,transform:'translate(-50%,0) scale(1)'}],{duration:360,easing:'cubic-bezier(.18,.8,.24,1)'});
  rewardToastTimer=setTimeout(()=>{toast.hidden=true;},3400);
}
function refresh() {
  if (!level) return;
  const total = totalStars(progress);
  $('level-label').textContent = mode === 'daily' ? `DAILY TRAIL · ${dailyStage + 1} / ${C.dailyLength}` : `LEVEL ${String(level.number).padStart(2,'0')}`;
  $('level-name').textContent = level.name;
  const lake=lakeForLevel(level.number),solved=Array.from({length:C.lakeLength},(_,i)=>progress.stars[`l${lake.first+i}`]).filter(Boolean).length;
  $('chapter-progress').textContent = mode === 'daily' ? `${new Date(dailyDay * 86400000).toISOString().slice(0,10)} · Shared daily trail` : `${lake.name} · ${solved} of ${C.lakeLength} levels complete`;
  $('app').classList.toggle('is-watching', phase === 'running' || phase === 'celebrate'); $('par').textContent = `PAR ${level.par}`;
  renderInventory();
  $('attempt-label').textContent = attempts ? `Drop ${attempts}` : 'Take your time';
  $('drop').querySelector('span:last-child').textContent = stones.length === 1 ? 'Drop stone' : 'Drop stones';
  $('drop').disabled = !stones.length || phase !== 'ready' || paused(); $('reset').disabled = !stones.length || phase !== 'ready' || paused();
  $('undo').disabled = !undoStack.length || phase!=='ready' || paused();
  $('mobile-stars').textContent = $('journal-stars').textContent = total;
  $('journal-balance').textContent = progress.tokens;
  const today=daySeed(), todayDone=!!progress.dailyResults[today]?.trail, todayQuick=!!(progress.dailyResults[today]?.quick||todayDone), giftClaimed=progress.dailyGift.lastDay===today;
  const giftDay=progress.dailyGift.lastDay===today-1 ? progress.dailyGift.streak+1 : 1;
  const giftCoins=C.dailyGiftCoins[(giftDay-1)%C.dailyGiftCoins.length];
  $('daily').replaceChildren(icon(giftClaimed?'calendar':'coin'));
  $('daily').classList.toggle('has-reward',!giftClaimed);
  $('daily').setAttribute('aria-label',giftClaimed?'Today’s trail':'Daily reward ready');
  $('daily').dataset.tooltip=$('daily').getAttribute('aria-label');
  $('claim-daily').disabled=giftClaimed;
  $('claim-daily').textContent=giftClaimed?'Claimed today':`Claim · +${giftCoins} coins`;
  $('daily-gift-title').textContent=giftClaimed?'See you tomorrow':`Day ${giftDay} reward`;
  $('daily-gift-detail').textContent=giftClaimed?`${progress.dailyGift.streak} day visit streak`:'One reward each day you return.';
  $('journal-daily').disabled = mode!=='daily' && progress.level <= C.dailyUnlock;
  $('journal-daily').textContent = mode==='daily'?'Return to journey':progress.level <= C.dailyUnlock ? 'Unlocks after level 3' : todayDone ? 'Replay today’s trail' : todayQuick ? 'Continue daily trail' : 'Play today’s puzzle';
  $('daily-title').textContent = todayQuick ? 'Today’s ripple ✓' : 'One daily ripple';
  $('daily-teaser').textContent = progress.level > C.dailyUnlock ? (todayDone ? 'Trail complete · New puzzle at 00:00 UTC.' : todayQuick ? 'Daily puzzle complete. Two more in the optional trail.' : 'One quick puzzle for a coin. Continue for a three-puzzle trail.') : 'Unlocks after level 3.';
  $('jump-keepsakes').classList.toggle('has-reward',readyDiscoveries(progress).length>0);
  $('sound').disabled = !!portal.muteAudio; $('sound').title = portal.muteAudio ? 'Muted by CrazyGames' : '';
  $('sound').classList.toggle('is-muted',sound.muted || portal.muteAudio);
  $('sound').setAttribute('aria-pressed',String(sound.muted || portal.muteAudio));
  $('sound').setAttribute('aria-label',portal.muteAudio ? 'Sound muted by CrazyGames' : sound.muted ? 'Unmute sound' : 'Mute sound');
  $('setting-sound').checked = !sound.muted && !portal.muteAudio;
  $('setting-sound').disabled = !!portal.muteAudio;
  $('setting-sound-note').textContent = portal.muteAudio ? 'Sound is controlled by CrazyGames' : 'All game audio';
  $('setting-sound-note').classList.toggle('sr-only',!portal.muteAudio);
  $('setting-ambience').disabled = sound.muted || !!portal.muteAudio;
  $('setting-music').disabled = sound.muted || !!portal.muteAudio;
  $('settings-context').textContent = mode === 'daily' ? `Daily trail · Puzzle ${dailyStage + 1}` : `Level ${String(level.number).padStart(2,'0')} · ${lake.name}`;
  $('pause').setAttribute('aria-label',manualPause ? 'Resume game' : 'Pause game');
  $('pause').setAttribute('aria-pressed',String(manualPause));
  $('sound').dataset.tooltip = $('sound').getAttribute('aria-label'); $('pause').dataset.tooltip = $('pause').getAttribute('aria-label');
  const ads = portal.eligible(), canDouble = !manualPause && phase === 'complete' && !progress.doubled[rewardKey()];
  const allHints = hintCount >= level.solution.length || (level.number >= 3 && level.number <= 5 && attempts >= C.hintFailures);
  $('hint').hidden = !(attempts >= C.hintFailures && phase === 'ready');
  $('hint').textContent = allHints && attempts < C.guidedHelpFailures ? 'Guide rings' : attempts >= C.freeHelpFailures ? 'Free help' : 'Hint';
  $('help-open').classList.toggle('help-ready',attempts>=C.freeHelpFailures && phase==='ready');
  $('help-open').dataset.tooltip = attempts>=C.freeHelpFailures && phase==='ready' ? 'Help · free guidance available' : 'Help';
  $('help-lake-name').textContent = level.name; $('help-tip').textContent = defaultInstruction();
  $('help-scoring').textContent = `Use ${level.par} ${level.par===1?'stone':'stones'} or fewer for three stars.`;
  $('hint-token').disabled = progress.tokens < 1 || allHints; $('hint-token').textContent = `Use 1 coin · Reveal a stone (${progress.tokens} left)`;
  $('hint-ad').hidden = !(ads && attempts >= C.rewardedFailures);
  $('hint-ad').hidden = $('hint-ad').hidden || allHints;
  $('hint-free').hidden = attempts < C.freeHelpFailures || allHints;
  $('hint-guide').hidden = attempts < C.guidedHelpFailures;
  $('hint-description').textContent = attempts >= C.guidedHelpFailures ? 'Try a complete guided layout, then press Drop to see how its waves work. Your progress and stars are kept.' : allHints ? 'All guide rings are visible. Place a stone in each ring and match its delay. A complete guided layout unlocks after 6 drops.' : attempts >= C.freeHelpFailures ? 'A free ring marks a solution stone. You can reveal more rings without spending coins.' : 'Reveal one solution stone, or keep experimenting. Free rings unlock after 4 drops; a guided layout after 6.';
  $('double').hidden = !(ads && canDouble); $('double-token').hidden = !canDouble; $('double-token').disabled = progress.tokens < 2;
  if (canDouble) {
    $('double-token').textContent = `Use 2 coins · +${result.stars} bonus stars`;
    $('double').textContent = `Watch ad · +${result.stars} bonus stars`;
  }
  $('bonus-options').hidden = !canDouble;
  if(ads && canDouble) $('bonus-options').open = true;
  const canReroll = !progress.goals.rerolled && !progress.goals.claimed.includes(0);
  $('reroll').hidden = !(ads && canReroll); $('reroll-token').hidden = !canReroll; $('reroll-token').disabled = progress.tokens < 1;
  $('token-balance').textContent = `${progress.tokens} coins`;
  $('daily').disabled = phase === 'running' || phase === 'celebrate' || adPaused || loading;
  $('collection-mobile').disabled = phase === 'running' || phase === 'celebrate' || adPaused || loading;
  $('collection-top').disabled = phase === 'running' || phase === 'celebrate' || adPaused || loading;
  renderGoals($('goals'));
  updateTutorialTip();
}
function overlay() {
  const wasHidden = $('overlay').hidden;
  $('overlay').hidden = !manualPause && phase !== 'complete';
  $('overlay').classList.toggle('is-paused',manualPause);
  $('overlay').classList.toggle('lake-finale',!manualPause && phase==='complete' && !!result?.lakeReward);
  $('result-stats').hidden = manualPause;
  $('pause-details').hidden = $('pause-actions').hidden = !manualPause;
  document.querySelector('.result-secondary').hidden = manualPause;
  for (const element of [document.querySelector('header'),document.querySelector('footer'),document.querySelector('.play-controls'),canvas]) element.inert = !$('overlay').hidden;
  if (wasHidden && !$('overlay').hidden) { revealPanel(document.querySelector('.overlay-inner')); $('next').focus({preventScroll:true}); }
  if (!wasHidden && $('overlay').hidden && $('overlay').contains(document.activeElement)) canvas.focus({preventScroll:true});
  if (manualPause) {
    $('result-discovery').hidden = true;
    $('overlay-kicker').textContent = 'GAME PAUSED'; $('reward-stars').replaceChildren(); $('overlay-title').textContent = 'A moment of stillness.'; $('overlay-text').textContent = ''; $('overlay-text').hidden = true; action('next','Resume game','play'); action('result-journal','Collection','journal',true); $('copy').hidden = true; $('double').hidden = true; $('double-token').hidden = true; $('bonus-options').hidden = true; $('replay').hidden = true; return;
  }
  if (phase !== 'complete') return;
  $('overlay-text').hidden = false;
  $('replay').hidden = false; action('replay','Play again','reset',true); $('replay').title = (result?.stars || 3) < 3 ? `Aim for ${level.par} stones to earn three stars` : 'Replay to beat your record';
  action('result-journal','Collection','journal',true);
  $('overlay-kicker').textContent = mode === 'daily' ? `DAILY TRAIL · ${dailyStage+1} OF ${C.dailyLength}` : `LEVEL ${String(level.number).padStart(2,'0')} COMPLETE`;
  $('reward-stars').replaceChildren(...Array.from({length:3},(_,i)=>icon('star',i<(result?.stars||3)?'earned':'')));
  $('reward-stars').setAttribute('role','img'); $('reward-stars').setAttribute('aria-label',`${result?.stars||3} of 3 stars`);
  $('overlay-title').textContent = result?.lakeReward ? 'A whole lake alight.' : result?.better ? 'Better than par.' : (result?.stars||3)===3 ? 'A perfect ripple.' : 'The lake is alight.';
  $('result-stats').replaceChildren(...[[stones.length,'Stones used'],[attempts,'Drops'],[`${result?.stars || 3} / 3`,'Level stars']].map(([value,label])=>{const cell=document.createElement('div'),n=document.createElement('strong'),text=document.createElement('span');n.textContent=value;text.textContent=label;cell.append(n,text);return cell;}));
  const detail = mode==='daily' ? dailyStage===0 ? `Daily ripple complete${result?.coinsGained?` · +${result.coinsGained} coin`:''}` : dailyStage===C.dailyLength-1 ? `Trail complete${result?.coinsGained?` · +${result.coinsGained} coins`:''}` : 'Trail puzzle complete' : result?.lakeReward ? `Lake complete · +${C.lakeCompletionCoins} coins` : result?.chapterReward ? `Chapter complete · +${C.chapterBonus} stars & ${C.chapterTokens} coins` : result?.first ? '+1 coin' : result?.newRecord ? 'A new personal best.' : 'Best score kept. Try fewer stones.';
  const dailyDone = mode === 'daily' && dailyStage === C.dailyLength - 1;
  $('overlay-text').textContent = `${detail}${dailyDone ? `\n${progress.streak} day trail streak` : mode === 'campaign' && level.number === 3 ? '\nDaily puzzle unlocked. One quick puzzle each day.' : ''}`;
  action('next',mode === 'daily' ? 'Back to your journey' : 'Next level','arrow-right');
  $('daily-continue').hidden = mode!=='daily' || dailyDone || daySeed()!==dailyDay;
  if (!$('daily-continue').hidden) action('daily-continue',`Continue trail · ${dailyStage+2}/${C.dailyLength}`,'arrow-right');
  $('copy').hidden = !dailyDone; $('copy').textContent = 'Copy daily result';
  const rewards = [...(result?.newLake ? [`Next lake · ${result.newLake}`] : []), ...((result?.discoveries || []).length ? [`${result.discoveries.length} milestone${result.discoveries.length===1?'':'s'} ready to claim in Collection`] : [])];
  if (result?.newLake) {
    const newCosmetics = [...C.cosmetics.stones, ...C.cosmetics.lanterns].filter(item => item.unlockLevel === progress.level);
    if (newCosmetics.length) rewards.push(`New in Shop · ${newCosmetics.length === 1 ? newCosmetics[0].name : `${newCosmetics.length} items`}`);
  }
  if (result?.goalBonus) rewards.push(`Daily goals completed · +${result.goalBonus} bonus stars`);
  if (progress.doubled[rewardKey()]) rewards.push(`Star bonus claimed · +${result?.stars || 3} stars`);
  if (result?.masteryReward) rewards.unshift(`Chapter mastered · +${C.masteryTokens} coins`);
  $('result-discovery').textContent = rewards.join('\n');
  $('result-discovery').hidden = !$('result-discovery').textContent;
  if(!$('overlay').hidden && $('overlay').contains(document.activeElement) && !document.activeElement.getClientRects().length) $('next').focus({preventScroll:true});

}
function rewardKey() { return mode === 'daily' ? `d${dailyDay}-${dailyStage}` : `l${level.number}`; }
function drop() {
  if (phase !== 'ready' || paused() || !stones.length) return;
  touched = true; attempts++; drops++; phase = 'running'; wave.reset(stones); lit.fill(false); sound.unlock(); sound.splash(progress.cosmetics.stone);
  renderer.failure=null;setInstruction('Watch your ripples meet.'); $('hint-finger').classList.remove('visible'); refresh(); save();
}
function win() {
  phase = 'celebrate'; celebration = 0; renderer.zoom = 1; sound.resolve();
}
function finishWin() {
  phase = 'complete'; renderer.zoom = 0;
  finishTutorial();
  const coinsBefore=progress.tokens;
  result = complete(progress, rewardKey(), stones.length, level.par, resetUsed, { attempts, elapsed });
  if (mode === 'campaign') { progress.level = Math.max(progress.level, level.number + 1); portal.milestone(progress.level - 1); }
  else { finishDaily(progress, dailyDay, dailyStage, result, stones.length);result.discoveries=readyDiscoveries(progress); }
  result.coinsGained=progress.tokens-coinsBefore;
  portal.happy(); syncPause(); refresh(); overlay(); save();
  // Full Launch only: an occasional chapter finish, never a daily or replay.
  // Rewarded offers share the SDK/local cooldown and cannot chain here.
  if (result.first && mode === 'campaign' && level.number % C.chapterLength === 0) {
    const completed = Object.keys(progress.stars).filter(key => /^l\d+$/.test(key)).length;
    portal.ad('midgame', completed).then(() => refresh());
  }
}
function tick(dt) {
  globalTime += dt; if (phase === 'ready' || phase === 'running') elapsed += dt;
  if (phase === 'running') {
    for (let s = 0; s < (attempts>1 ? C.retryStepsPerTick : C.stepsPerTick); s++) {
      wave.step();
      level.lanterns.forEach((l,i) => { if (!lit[i] && wave.peak[cell(l.x,l.y)] >= C.threshold) { lit[i] = true; renderer.burst(l.x,l.y,globalTime); sound.chime(lit.filter(Boolean).length - 1,progress.cosmetics.lantern); refresh(); } });
      if (lit.every(Boolean)) { win(); break; }
      if (wave.stepNumber >= C.steps) {
        phase = 'ready';
        const hint = level.number >= 3 && level.number <= 5 && attempts >= C.hintFailures;
        const weak = level.lanterns.map((l,i)=>({i,ratio:wave.peak[cell(l.x,l.y)]/C.threshold})).filter(p=>!lit[p.i]).sort((a,b)=>b.ratio-a.ratio)[0];
        renderer.failure=weak?.i ?? null;
        sound.fail();
        setInstruction(attempts >= C.freeHelpFailures ? `${lit.filter(Boolean).length}/${lit.length} lit. Free guidance is available in Help.` : hint ? 'Two waves meeting make a bigger wave. Try the faint rings.' : weak?.ratio>=.7 ? `${lit.filter(Boolean).length}/${lit.length} lit. The marked lantern is close; shift a stone slightly.` : `${lit.filter(Boolean).length}/${lit.length} lit. Bring two ripples together by the marked lantern.`,true,true);
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
let lastRender = -Infinity, renderSamples = 0, renderCost = 0, slowRenders = 0, waterQualityStep = 0, fastBatches = 0;
function frame(now) {
  const dt = Math.min(C.maxFrameDelta, (now - last) / 1000); last = now;
  sound.update(phase);
  const resting=paused();
  if (level && !resting) { accumulator += dt; while (accumulator >= 1 / C.tickHz) { tick(1 / C.tickHz); accumulator -= 1 / C.tickHz; } }
  const renderInterval = resting ? 1000 / 3 : phase === 'complete' ? 1000 / 30 : 1000 / 72;
  if (wave && level && now - lastRender >= renderInterval - 1) {
    lastRender = now;
    if (inventoryArtVersion !== renderer.artVersion) renderInventory();
    const tutorialHints = level.number >= 3 && level.number <= 5 && attempts >= C.hintFailures;
    const hints = phase === 'ready' ? level.solution.slice(0, tutorialHints ? level.solution.length : hintCount) : [];
    const existingMap = renderer.photoMap, proceduralReady = renderer.cachedTheme === renderer.theme;
    const drawStart = performance.now();
    renderer.draw(wave, level, stones, lit, globalTime, phase === 'running' || phase === 'celebrate' || phase === 'complete', hints, hover);
    if (!resting && phase !== 'complete' && (existingMap && existingMap === renderer.photoMap || proceduralReady && renderer.cachedTheme === renderer.theme)) {
      renderCost += performance.now() - drawStart; renderSamples++;
      if (dt > .032 && dt < .11) slowRenders++;
      if (renderSamples >= 20) {
        const meanCost=renderCost/renderSamples;
        if(meanCost>7.5 || slowRenders>=8) {
          fastBatches=0;
          if(waterQualityStep<3) {
            renderer.setWaterResolution([360,280,240][waterQualityStep]);
            if(waterQualityStep===1)renderer.setRenderScale(.75);
            if(waterQualityStep===2)renderer.setRenderScale(.6);
            waterQualityStep++;
          }
        } else if(waterQualityStep>0 && meanCost<5 && slowRenders<=1 && ++fastBatches>=6) {
          waterQualityStep--;
          renderer.setWaterResolution([C.render.waterResolution,360,280][waterQualityStep]);
          if(waterQualityStep===2)renderer.setRenderScale(.75);
          if(waterQualityStep===1)renderer.setRenderScale(1);
          fastBatches=0;
        } else if(meanCost>=5 || slowRenders>1)fastBatches=0;
        renderCost = 0; renderSamples = 0; slowRenders = 0;
      }
    }
    $('hint-finger').style.left = `${renderer.view.x + renderer.view.width / 2}px`; $('hint-finger').style.top = `${renderer.view.y + renderer.view.height / 2}px`;
    $('hint-finger').classList.toggle('visible', level.number === 1 && mode === 'campaign' && !progress.stars.l1 && stones.length === 0 && elapsed > 5 && phase === 'ready' && !paused());
    if (debug) $('debug').textContent = `Ripple · ${mode}\nLake ${level.number} | ${phase}${paused() ? ' (paused)' : ''}\nAttempts ${attempts} | session drops ${drops}\nActive time ${elapsed.toFixed(1)} s\nGeneration ${level.generationMs.toFixed(1)} ms\nStep ${wave.stepNumber} / ${C.steps} | T ${C.threshold}\nPeaks ${level.lanterns.map(l => wave.peak[cell(l.x,l.y)].toFixed(4)).join(' / ')}\nFPS ~${Math.round(1 / Math.max(.001,dt))} | seed ${level.seed}`;
  }
  if (++frameCount % C.tickHz === 0) { rollDay(progress); refresh(); }
  requestAnimationFrame(frame);
}
function point(e) { return renderer.point(e.clientX, e.clientY); }
function edited(record=true) {
  if(record&&JSON.stringify(lastPlacement)!==JSON.stringify(stones)){undoStack.push(lastPlacement);if(undoStack.length>30)undoStack.shift();}
  lastPlacement=stones.map(s=>({...s}));
  wave.reset(); lit.fill(false); renderer.failure=null;setInstruction(defaultInstruction()); touched = true; sound.place(); refresh(); save();
}
function undoEdit(){if(!undoStack.length||phase!=='ready'||paused())return;cancelPointer();stones=undoStack.pop().map(s=>({...s}));edited(false);setInstruction('Last edit undone. Keep exploring.');}
function cancelPointer() {
  if (!pointer) return;
  const { id, index, original } = pointer;
  if (index >= 0 && stones[index]) stones[index] = original;
  pointer = null; hover = null; canvas.classList.remove('is-panning','is-stone','is-moving');
  if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  if (level) { wave.reset(); lit.fill(false); refresh(); }
}
canvas.addEventListener('pointerdown', e => {
  if (pointer || !level || phase !== 'ready' || paused() || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); sound.unlock(); touched = true; const p = point(e), v = renderer.view, hitRadius = e.pointerType === 'touch' ? C.touchPixels / 2 : Math.max(C.mouseHitPixels, C.touchRadius * v.size / C.size);
  let index = -1, nearest = hitRadius ** 2; stones.forEach((s,i) => { const d = ((p.x - s.x) * v.width / C.size) ** 2 + ((p.y - s.y) * v.height / C.size) ** 2; if (d <= nearest) { index = i; nearest = d; } });
  pointer = { id: e.pointerId, start: p, startScreen:{x:e.clientX,y:e.clientY}, lastScreen:{x:e.clientX,y:e.clientY}, offset:index >= 0 ? {x:stones[index].x-p.x,y:stones[index].y-p.y} : {x:0,y:0}, index, original: index >= 0 ? {...stones[index]} : null, moved: false };
  canvas.classList.toggle('is-moving',index >= 0);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  let p = point(e); if (!level) return;
  const v = renderer.view;
  const onStone = stones.some(s => ((p.x-s.x)*v.width/C.size)**2 + ((p.y-s.y)*v.height/C.size)**2 <= Math.max(C.mouseHitPixels,C.touchRadius*v.size/C.size)**2);
  canvas.classList.toggle('is-stone',onStone && !pointer);
  hover = onStone ? null : { ...p, valid: canPlace(p,level,stones,pointer?.index ?? -1) };
  if (!pointer || pointer.id !== e.pointerId) return;
  if (distance2({x:e.clientX,y:e.clientY}, pointer.startScreen) > 6 ** 2) pointer.moved = true;
  if (pointer.moved && pointer.index < 0 && e.pointerType === 'mouse') {
    renderer.pan(e.clientX-pointer.lastScreen.x,e.clientY-pointer.lastScreen.y);
    canvas.classList.add('is-panning');
    p = point(e); hover = null;
  }
  pointer.lastScreen = {x:e.clientX,y:e.clientY};
  const target = {x:p.x+pointer.offset.x,y:p.y+pointer.offset.y};
  if (pointer.moved && pointer.index >= 0 && canPlace(target,level,stones,pointer.index)) { stones[pointer.index] = { ...target, delay: pointer.original.delay }; wave.reset(); lit.fill(false); }
});
canvas.addEventListener('pointerup', e => {
  if (!pointer || e.pointerId !== pointer.id) return;
  const p = point(e), { index, moved, original } = pointer;
  if (index >= 0) {
    const outside = moved && (p.x < 0 || p.y < 0 || p.x >= C.size || p.y >= C.size);
    if (outside) { stones[index] = original; wave.reset(); lit.fill(false); refresh(); setInstruction('Keep stones in the lake. Right-click to remove one.',true); }
    else if (level.number >= C.delayUnlock) stones[index].delay = ((stones[index].delay || 0) + 1) % (C.maxDelay + 1);
    if (!outside && (moved || level.number >= C.delayUnlock)) edited();
    else if (!outside) setInstruction('Drag this stone to move it. Right-click to remove it.',true);
  } else if (!moved && stones.length < level.limit && canPlace(p,level,stones)) { stones.push({ ...p, delay:0 }); edited(); }
  else if (!moved) setInstruction(stones.length >= level.limit ? 'All stones placed. Move one, or right-click to remove it.' : 'Choose open water outside the protected circles.',true);
  pointer = null; canvas.classList.remove('is-panning','is-moving'); if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('wheel', e => {
  if (!level || adPaused || dialogOpen()) return;
  e.preventDefault(); renderer.zoomAt(e.clientX,e.clientY,Math.exp(-Math.max(-180,Math.min(180,e.deltaY))*.0015));
  hover = null;
}, {passive:false});
canvas.addEventListener('pointercancel', e => { if (pointer?.id === e.pointerId) cancelPointer(); });
canvas.addEventListener('lostpointercapture', e => { if (pointer?.id === e.pointerId) cancelPointer(); });
canvas.addEventListener('pointerleave', () => { hover = null; canvas.classList.remove('is-stone'); });
canvas.addEventListener('contextmenu',e=>{
  if(!level || phase!=='ready' || paused())return;
  e.preventDefault();cancelPointer();const p=point(e),v=renderer.view;
  let index=-1,nearest=Math.max(C.mouseHitPixels,C.touchRadius*v.size/C.size)**2;
  stones.forEach((s,i)=>{const d=((p.x-s.x)*v.width/C.size)**2+((p.y-s.y)*v.height/C.size)**2;if(d<=nearest){index=i;nearest=d;}});
  if(index>=0){sound.unlock();stones.splice(index,1);edited();}
});
$('drop').onclick = drop;
$('undo').onclick = undoEdit;
$('reset').onclick = () => { if (phase !== 'ready' || paused()) return; stones = []; resetUsed = true; edited(); };
$('reset-view').onclick = () => { renderer.resetCamera(); $('controls-dialog').close(); syncPause(); refresh(); canvas.focus({preventScroll:true}); };
$('sound').onclick = () => { if (portal.muteAudio) return; sound.muted = !sound.muted; progress.muted = sound.muted; sound.unlock(); sound.sync(); save(); refresh(); };
$('pause').onclick = () => { if (adPaused || loading) return; manualPause = !manualPause; $('pause').setAttribute('aria-label', manualPause ? 'Resume game' : 'Pause game'); syncPause(); overlay(); refresh(); save(); };
$('welcome-start').onclick = event => { const keyboardFocus = event.detail === 0; tutorialActive = true; $('welcome-dialog').close(); syncPause(); refresh(); if (keyboardFocus) canvas.focus({preventScroll:true}); };
function skipTutorial(event) { const keyboardFocus = event.detail === 0; tutorialActive = false; progress.tutorialDone = true; $('tutorial-tip').hidden = $('tutorial-target').hidden = true; $('drop').classList.remove('tutorial-highlight'); if ($('welcome-dialog').open) $('welcome-dialog').close(); syncPause(); refresh(); save(); if (keyboardFocus) canvas.focus({preventScroll:true}); }
$('welcome-skip').onclick = $('tutorial-skip').onclick = skipTutorial;
$('welcome-dialog').addEventListener('close', () => { if (!tutorialActive && !progress.tutorialDone) { progress.tutorialDone = true; save(); } syncPause(); refresh(); });
$('next').onclick = async () => {
  if (adPaused || loading) return;
  if (manualPause) { manualPause = false; syncPause(); refresh(); overlay(); return; }
  if (phase !== 'complete') return;
  if (mode === 'daily') {
    if (progress.campaign?.completed) progress.campaign={number:progress.level};
    await enter('campaign'); return;
  }
  const nextNumber = level.number + 1; progress.campaign = { number: nextNumber }; level = null; await enter('campaign');
};
$('daily').onclick = () => { if (!paused() && phase!=='running' && phase!=='celebrate') { journalTab='today'; openCollection(); } };
async function reward(action) {
  if (portal.busy) return;
  // Offers are only in paused dialogs or the result screen.
  const wasManual = manualPause; manualPause = true;
  $('hint-dialog').close(); $('collection-dialog').close(); syncPause();
  const success = await portal.ad('rewarded'); if (success) action();
  manualPause = wasManual; syncPause(); refresh(); overlay(); save();
  if (!success) {
    if (phase === 'complete') showRewardToast('Ad unavailable','Continue or use coins instead',false);
    else setInstruction('No ad available. Your stones and coins are safe.',true);
  }
}
function reveal() { hintCount = Math.min(level.solution.length, hintCount + 1); setInstruction('A faint ring marks one solution stone. Match its delay if shown.',true); }
function doubleStars() { const key = rewardKey(); if (!result || progress.doubled[key]) return; progress.doubled[key] = true; progress.bonus += result.stars; result.gained += result.stars; result.discoveries=readyDiscoveries(progress); }
function reroll() { progress.goals.rerolled = true; save(); refresh(); }
$('hint').onclick = () => { if (phase !== 'ready' || adPaused || loading) return; $('help-dialog').close(); $('hint-dialog').showModal(); revealPanel($('hint-dialog')); syncPause(); refresh(); };
$('hint-close').onclick = () => $('hint-dialog').close();
$('hint-dismiss').onclick = () => $('hint-dialog').close();
$('hint-dialog').addEventListener('close', () => { syncPause(); refresh(); if(!manualPause) $('help-open').focus({preventScroll:true}); });
$('help-open').onclick = () => { if(loading||adPaused)return; $('help-dialog').showModal();revealPanel($('help-dialog'));syncPause();refresh(); };
for(const id of ['help-dismiss','help-close'])$(id).onclick=()=>$('help-dialog').close();
$('help-dialog').addEventListener('close',()=>{syncPause();refresh();});
let controlsReturnToJournal = false;
function openControls(fromJournal = false) { if(loading||adPaused)return; controlsReturnToJournal = fromJournal; $('controls-dialog').showModal();revealPanel($('controls-dialog'));syncPause();refresh(); }
$('how-to').onclick = $('pause-controls').onclick = () => openControls();
for(const id of ['controls-dismiss','controls-close'])$(id).onclick=()=>$('controls-dialog').close();
$('controls-dialog').addEventListener('close',()=>{syncPause();refresh();if (controlsReturnToJournal) { controlsReturnToJournal = false; openCollection(); }});
let settingsReturnToJournal = false;
function openSettings(fromJournal = false) {
  if (loading || adPaused) return;
  settingsReturnToJournal = fromJournal;
  if (fromJournal) $('collection-dialog').close();
  $('settings-dialog').showModal(); revealPanel($('settings-dialog')); syncPause(); refresh();
}
$('pause-settings').onclick = () => openSettings();
$('journal-settings').onclick = () => openSettings(true);
for (const id of ['settings-dismiss','settings-close']) $(id).onclick = () => $('settings-dialog').close();
$('settings-dialog').addEventListener('close', () => { syncPause(); refresh(); if (settingsReturnToJournal) { settingsReturnToJournal = false; openCollection(); } });
$('settings-howto').onclick = () => { const returnToJournal = settingsReturnToJournal; settingsReturnToJournal = false; $('settings-dialog').close(); openControls(returnToJournal); };
$('setting-sound').onchange = event => { if (portal.muteAudio) return; sound.muted = !event.target.checked; progress.muted = sound.muted; sound.unlock(); sound.sync(); save(); refresh(); };
$('setting-ambience').onchange = event => { progress.preferences.ambientSound = event.target.checked; sound.ambientEnabled = event.target.checked; sound.sync(); save(); refresh(); };
$('setting-music').onchange = event => { progress.preferences.musicEnabled = event.target.checked; sound.musicEnabled = event.target.checked; sound.sync(); save(); refresh(); };
for (const [id,key] of [['setting-motion','reducedMotion'],['setting-contrast','highContrast'],['setting-dock','dockTop']]) $(id).onchange = event => { progress.preferences[key] = event.target.checked; applyPreferences(); save(); refresh(); };
$('hint-token').onclick = () => { if (spend(progress,1)) { reveal(); $('hint-dialog').close(); save(); refresh(); } };
$('hint-free').onclick = () => { if (attempts >= C.freeHelpFailures) { reveal(); $('hint-dialog').close(); save(); refresh(); } };
$('hint-guide').onclick = () => { if (attempts < C.guidedHelpFailures || phase !== 'ready') return; stones = level.solution.map(s=>({...s})); hintCount = level.solution.length; $('hint-dialog').close(); edited(); setInstruction('Guided layout ready. Press Drop and watch the waves meet.'); };
$('hint-ad').onclick = () => reward(reveal);
$('double').onclick = () => { if (!progress.doubled[rewardKey()] && phase === 'complete') reward(doubleStars); };
$('double-token').onclick = () => { if (phase === 'complete' && !progress.doubled[rewardKey()] && spend(progress,2)) { doubleStars(); save(); refresh(); overlay(); } };
$('reroll').onclick = () => reward(reroll);
$('reroll-token').onclick = () => { if (!progress.goals.rerolled && spend(progress,1)) reroll(); };
$('replay').onclick = async () => {
  if (phase !== 'complete' || adPaused) return;
  progress[mode] = { number:level.number, day:dailyDay, stage:dailyStage }; level = null; await enter();
};
$('daily-continue').onclick = async () => {
  if (mode!=='daily'||phase!=='complete'||dailyStage>=C.dailyLength-1||daySeed()!==dailyDay||loading||adPaused)return;
  progress.daily={day:dailyDay,stage:dailyStage+1};level=null;await enter('daily');
};
$('dock').onclick = () => { progress.preferences.dockTop = !progress.preferences.dockTop; applyPreferences(); save(); $('controls-dialog').close(); };
$('copy').onclick = async () => {
  const record = progress.dailyResults[dailyDay] || {stars:result.stars,stones:stones.length};
  const text = `Ripple Daily #${dailyDay} · ${record.stars}/${C.dailyLength * 3} stars · ${record.stones} stones · ${C.dailyLength}/${C.dailyLength} lakes 🔆🔆🔆`;
  try { await navigator.clipboard.writeText(text); $('copy').textContent = 'Copied ✓'; }
  catch { const area = document.createElement('textarea'); area.value = text; area.style.cssText = 'position:fixed;left:0;top:0;opacity:.01'; document.body.append(area); area.select(); const ok = document.execCommand('copy'); area.remove(); $('copy').textContent = ok ? 'Copied ✓' : text; }
};
function openCollection() {
  if (phase === 'running' || phase === 'celebrate' || adPaused || loading) return;
  renderLakeList();
  renderDiscoveries();
  applyTheme();
  action('continue-journey',`Play level ${String(progress.level).padStart(2,'0')}`,'arrow-right');
  if (!$('collection-dialog').open) { showJournalTab(journalTab); $('collection-dialog').showModal(); revealPanel($('collection-dialog')); } syncPause(); refresh();

}
function renderLakeList() {
  const first = collectionPage * C.lakeLength + 1, lake=lakeForLevel(first);
  const scores=Array.from({length:C.lakeLength},(_,i)=>Number(progress.stars[`l${first+i}`])||0);
  $('lake-page').textContent = lake.name;
  $('mastery-progress').textContent = `LEVELS ${String(lake.first).padStart(2,'0')}–${String(lake.last).padStart(2,'0')} · ${scores.reduce((a,b)=>a+b,0)}/${C.lakeLength*3} stars`;
  const target=[masteryTarget(progress,first),masteryTarget(progress,first+C.chapterLength)].filter(Boolean).sort((a,b)=>b.stars-a.stars||a.number-b.number)[0];
  $('mastery-replay').hidden=!target;
  if(target){action('mastery-replay',`Improve level ${target.number} · ${target.stars}/3 stars`,'arrow-right');$('mastery-replay').onclick=()=>revisitLake(target.number);}
  $('page-back').disabled = collectionPage === 0; $('page-next').disabled = first+C.lakeLength>=Math.max(C.featuredLevels,progress.level+1);
  $('lake-list').replaceChildren(...Array.from({length:C.lakeLength}, (_,i) => {
    const number = first + i, b = document.createElement('button'), mark = document.createElement('small');
    const available = number <= progress.level, next = number === progress.level + 1 && progress.level > 1;
    b.disabled = !available && (!next || progress.tokens < C.lakeSkipCost);
    b.classList.toggle('lake-for-sale',next);
    const numberLabel=document.createElement('span'),name=document.createElement('span');numberLabel.className='lake-number';numberLabel.textContent=String(number).padStart(2,'0');
    name.className='lake-label';name.textContent=SCRIPTED[number-1]?.name || levelName(number);
    const stars = progress.stars[`l${number}`] || 0;
    if (!available) {numberLabel.append(icon('lock'));mark.textContent=next ? `${C.lakeSkipCost} coins` : 'Locked';}
    else if (stars) mark.append(...Array.from({length:3},(_,i)=>icon('star',i<stars?'earned':'')));
    else mark.textContent = number === progress.level ? 'Next level' : 'Play';
    mark.setAttribute('aria-hidden','true');
    b.setAttribute('aria-label',`Level ${number}, ${name.textContent}, ${next ? progress.tokens >= C.lakeSkipCost ? `unlock for ${C.lakeSkipCost} coins` : `needs ${C.lakeSkipCost} coins` : available ? stars ? `${stars} of 3 stars` : 'ready to play' : 'locked'}`);
    if (mode === 'campaign' && level?.number === number) b.setAttribute('aria-current','step');
    const record = progress.records[`l${number}`]; b.title = record ? `Best: ${record.stones} stones, ${record.attempts} drops` : `Level ${number}`;
    b.append(numberLabel,name,mark); b.onclick = () => {
      if (next) { if (!buyNextLake(progress,number)) return; save(); }
      revisitLake(number);
    }; return b;
  }));
}
async function revisitLake(number) {
  if(loading||adPaused||number>progress.level)return;
  save();progress.campaign={number};level=null;$('collection-dialog').close();manualPause=false;await enter('campaign');
}
$('page-back').onclick = () => { collectionPage = Math.max(0, collectionPage - 1); renderLakeList(); };
$('page-next').onclick = () => { collectionPage = Math.min(Math.ceil(Math.max(C.featuredLevels,progress.level+1)/C.lakeLength)-1, collectionPage + 1); renderLakeList(); };
$('collection-top').onclick = () => { collectionPage = lakeForLevel(progress.level).group; journalTab = 'lakes'; openCollection(); };
$('collection-mobile').onclick = () => { collectionPage = lakeForLevel(progress.level).group; journalTab = 'lakes'; openCollection(); };
$('result-journal').onclick = () => { collectionPage = lakeForLevel(progress.level).group; journalTab = 'lakes'; openCollection(); };
$('continue-journey').onclick = async () => {
  if (loading || adPaused) return;
  $('collection-dialog').close(); manualPause = false;
  if (mode === 'campaign' && level.number === progress.level && phase !== 'complete') { syncPause(); overlay(); refresh(); return; }
  save(); progress.campaign = {number:progress.level}; level = null; await enter('campaign');
};
function showJournalTab(name, focus = false) {
  journalTab = name;
  if(name==='shop')renderShop();
  for (const tab of document.querySelectorAll('[data-panel]')) {
    const selected = tab.dataset.panel === name;
    tab.setAttribute('aria-selected',String(selected)); tab.tabIndex = selected ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !selected;
    if (selected && focus) tab.focus();
  }
  $('journal-body').scrollTop = 0;
  const tabs=$('collection-dialog').querySelector('.journal-tabs');
  if(tabs.scrollWidth<=tabs.clientWidth+1)tabs.scrollLeft=0;
}
const journalTabs = [...document.querySelectorAll('[data-panel]')];
for (const [index,tab] of journalTabs.entries()) {
  tab.onclick = () => showJournalTab(tab.dataset.panel);
  tab.onkeydown = event => {
    const next = event.key === 'ArrowRight' ? (index+1)%journalTabs.length : event.key === 'ArrowLeft' ? (index+journalTabs.length-1)%journalTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? journalTabs.length-1 : null;
    if (next !== null) { event.preventDefault(); showJournalTab(journalTabs[next].dataset.panel,true); }
  };
}
$('journal-daily').onclick = async () => { if (loading || adPaused || (mode!=='daily'&&progress.level<=C.dailyUnlock)) return; $('collection-dialog').close(); manualPause = false; if(mode!=='daily'&&progress.dailyResults[daySeed()]?.trail){save();progress.daily={day:daySeed(),stage:0};level=null;} await enter(mode==='daily'?'campaign':'daily'); };
$('claim-daily').onclick = () => { const gift=claimDailyGift(progress);if(!gift)return;save();refresh();renderDiscoveries();showRewardToast(`Day ${gift.streak} reward`,`+${gift.reward} coins`); };
for(const button of $('theme-options').querySelectorAll('button'))button.onclick=()=>{if(setLakeLight(progress,activeLakeNumber(),button.dataset.light)){applyTheme();save();showRewardToast(button.dataset.light==='day'?'Daylight selected':'Nightfall selected',lakeForLevel(activeLakeNumber()).name);} };
$('journal-back').onclick = () => $('collection-dialog').close();
$('close-dialog').onclick = () => $('collection-dialog').close(); $('collection-dialog').addEventListener('close', () => { syncPause(); refresh(); });
document.addEventListener('visibilitychange', () => { hidden = document.hidden; syncPause(true); save(); }); window.addEventListener('pagehide',save);
function keyboardHover() {
  hover = {...keyboardPoint,valid:canPlace(keyboardPoint,level,stones),keyboard:true};
  const index = stones.findIndex(s=>distance2(s,keyboardPoint)<C.touchRadius**2);
  $('keyboard-status').textContent = `Position ${keyboardPoint.x}, ${keyboardPoint.y}. ${index>=0 ? `Stone ${index+1}, delay ${stones[index].delay||0} seconds. ${level.number>=C.delayUnlock?'Enter to change delay. ':''}Delete to remove.` : hover.valid ? 'Open water. Enter to place.' : 'Protected water. Choose another spot.'}`;
}
canvas.addEventListener('focus',()=>{ if(level && phase==='ready') keyboardHover(); });
canvas.addEventListener('blur',()=>{ if(hover?.keyboard) hover=null; });
document.addEventListener('keydown', e => {
  if (e.code === 'F3') { e.preventDefault(); debug = !debug; $('debug').hidden = !debug; }
  if (e.key==='Tab' && !$('overlay').hidden && !dialogOpen()) {
    const controls = [...$('overlay').querySelectorAll('button,summary')].filter(b=>!b.hidden&&!b.disabled&&b.getClientRects().length&&(!b.closest('details:not([open])')||b.tagName==='SUMMARY'));
    const current = controls.indexOf(document.activeElement);
    if (controls.length && (current<0 || e.shiftKey&&current===0 || !e.shiftKey&&current===controls.length-1)) { e.preventDefault(); controls[e.shiftKey ? controls.length-1 : 0].focus(); }
  }
  if(e.target===canvas && level && !paused() && phase==='ready' && (e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z' && !e.shiftKey && !e.altKey){e.preventDefault();undoEdit();keyboardHover();return;}
  if (e.target!==canvas || !level || paused() || phase!=='ready' || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === '0') { e.preventDefault(); renderer.resetCamera(); keyboardHover(); return; }
  const delta = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if (delta) { e.preventDefault(); const step=e.shiftKey?4:1; keyboardPoint={x:Math.max(0,Math.min(127,keyboardPoint.x+delta[0]*step)),y:Math.max(0,Math.min(127,keyboardPoint.y+delta[1]*step))}; keyboardHover(); return; }
  if (e.code==='Space') { e.preventDefault(); drop(); return; }
  if (!['Enter','Delete','Backspace'].includes(e.key)) return;
  e.preventDefault(); if(e.repeat) return;
  sound.unlock();
  const index = stones.findIndex(s=>distance2(s,keyboardPoint)<C.touchRadius**2);
  if (index>=0) {
    if(e.key==='Enter'&&level.number>=C.delayUnlock) { stones[index].delay=((stones[index].delay||0)+1)%(C.maxDelay+1); edited(); }
    else if(e.key!=='Enter') { stones.splice(index,1); edited(); }
    else setInstruction('Use Delete to remove this stone, then choose a new place.',true);
  }
  else if(e.key==='Enter' && stones.length<level.limit && canPlace(keyboardPoint,level,stones)) { stones.push({...keyboardPoint,delay:0}); edited(); }
  keyboardHover();
});

requestAnimationFrame(frame); await enter();
portal.init().then(async () => {
  if (portal.sdk?.data) {
    const cloud = portal.initialData;
    if (cloud && !touched) { progress = parseProgress(cloud); mode = progress.mode; level = null; await enter(); }
    else if (cloud) {
      const remote = parseProgress(cloud);
      for (const [key,value] of Object.entries(remote.stars)) progress.stars[key] = Math.max(progress.stars[key] || 0, value);
      progress.level = Math.max(progress.level,remote.level); progress.bonus = Math.max(progress.bonus,remote.bonus);
      for(const key of ['doubled','dailyResults','chapters','mastery','lakeRewards','discoveries','records'])progress[key]={...remote[key],...progress[key]};
      progress.lakeLights={...remote.lakeLights,...progress.lakeLights};
      for(const kind of ['stones','lanterns'])progress.cosmetics[kind]=[...new Set([...remote.cosmetics[kind],...progress.cosmetics[kind]])];
      progress.tokens=Math.max(progress.tokens,remote.tokens);
      if(remote.dailyGift.lastDay>progress.dailyGift.lastDay)progress.dailyGift=remote.dailyGift;
      if (remote.lastDaily > progress.lastDaily) { progress.lastDaily = remote.lastDaily; progress.streak = remote.streak; }
      applyTheme();
    }
    portal.acceptData(); save();
  }
  portal.context({ level:level.number, mode }); syncPause(); refresh();
});
// Explicit test-only harness; production URL exposes no solution controls.
if (new URLSearchParams(location.search).has('test')) window.__ripple = {
  get state() { return {mode,dailyDay,dailyStage,view:renderer.view,level,stones,lit,phase,attempts,progress,elapsed,paused:paused(),step:wave.stepNumber,waterResolution:renderer.waterResolution}; },
  solve() { stones = level.solution.map(s=>({...s})); edited(); drop(); },
  place(value) { stones = value; edited(); }, drop,
  async go(number) { progress.campaign = {number}; level = null; await enter('campaign'); },
  daily: () => { progress.level = Math.max(4,progress.level); return enter('daily'); },
  portal, sound, refresh, save,
};
