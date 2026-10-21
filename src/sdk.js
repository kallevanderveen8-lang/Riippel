import { C } from './config.js';
// Optional official SDK is the only network dependency. Core game never waits
// for it; unavailable/blocked SDK leaves fully playable local mode.
export class Portal {
  constructor(onPause = () => {}) { this.sdk = null; this.active = false; this.wantsPlay = true; this.onPause = onPause; this.ads = false; this.busy = false; this.lastAd = -Infinity; this.boot = performance.now(); this.lastMidLevel = 0; }
  async init() {
    try {
      const origins = [...(location.ancestorOrigins || [])];
      const portal = /(^|\.)crazygames\.(com|net)$/.test(location.hostname) || origins.some(o => /^https:\/\/([a-z0-9-]+\.)?crazygames\.(com|net)$/.test(o)) || new URLSearchParams(location.search).has('sdk');
      if (!window.CrazyGames?.SDK && portal) await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'; script.async = true;
        const timer = setTimeout(() => { script.remove(); reject(new Error('SDK timeout')); }, C.sdkTimeoutMs);
        script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); reject(new Error('SDK unavailable')); }; document.head.append(script);
      });
      const sdk = window.CrazyGames?.SDK; if (!sdk) return;
      await sdk.init(); this.sdk = sdk;
      if (this.wantsPlay) this.start();
      try { this.ads = !!sdk.ad?.requestAd && !(await sdk.ad.hasAdblock()); } catch { this.ads = false; }
    } catch { this.sdk = null; this.ads = false; }
  }
  start() { this.wantsPlay = true; if (!this.sdk || this.active) return; try { this.sdk.game.gameplayStart(); this.active = true; } catch {} }
  stop() { this.wantsPlay = false; if (!this.sdk || !this.active) return; try { this.sdk.game.gameplayStop(); this.active = false; } catch {} }
  happy() { try { this.sdk?.game.happytime(); } catch {} }
  read() { try { return this.sdk?.data ? this.sdk.data.getItem(C.saveKey) : localStorage.getItem(C.saveKey); } catch { return null; } }
  write(value) { try { if (this.sdk?.data) this.sdk.data.setItem(C.saveKey, value); else localStorage.setItem(C.saveKey, value); return true; } catch { return false; } }
  eligible() { return this.ads && !this.busy && performance.now() - this.boot >= C.firstAdSeconds * 1000 && performance.now() - this.lastAd >= C.adIntervalSeconds * 1000; }
  async ad(type, completedLevels = 0) {
    if (!this.eligible() || (type === 'midgame' && completedLevels - this.lastMidLevel < C.adEveryLevels)) return false;
    this.busy = true; this.lastAd = performance.now(); if (type === 'midgame') this.lastMidLevel = completedLevels;
    const resume = this.wantsPlay; this.stop(); this.onPause(true);
    return new Promise(resolve => {
      let done = false;
      const finish = success => { if (done) return; done = true; clearTimeout(timer); this.busy = false; this.onPause(false); if (resume && this.wantsPlay) this.start(); resolve(success); };
      const timer = setTimeout(() => finish(false), C.adTimeoutMs);
      try { this.sdk.ad.requestAd(type, { adStarted: () => { this.onPause(true); }, adFinished: () => finish(true), adError: error => { if (['adblock', 'adsDisabledBasicLaunch'].includes(error?.code)) this.ads = false; finish(false); } }); } catch { finish(false); }
    });
  }
}
