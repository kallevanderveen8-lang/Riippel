import { C } from './config.js';
const deadline = (task, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('SDK timeout')), ms);
  Promise.resolve(task).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});
// Only the official SDK can serve ads. Basic Launch deliberately disables them.
export class Portal {
  constructor(onAdState = () => {}, onSettings = () => {}, options = {}) {
    this.sdk = null; this.active = false; this.wantsPlay = false; this.onAdState = onAdState; this.onSettings = onSettings;
    this.launchStage = options.launchStage || C.launchStage; this.ads = false; this.busy = false; this.muteAudio = false;
    this.lastAd = -Infinity; this.boot = performance.now(); this.lastMidLevel = 0; this.cloudRead = false; this.dataAccepted = false; this.loading = false;
  }
  async init() {
    try {
      if (!window.CrazyGames?.SDK) await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'; script.async = true;
        const timer = setTimeout(() => { script.remove(); reject(new Error('SDK unavailable')); }, C.sdkTimeoutMs);
        script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); reject(new Error('SDK unavailable')); }; document.head.append(script);
      });
      const sdk = window.CrazyGames?.SDK; if (!sdk) return;
      await deadline(sdk.init(), C.sdkInitTimeoutMs);
      if (!['local', 'crazygames'].includes(sdk.environment)) return;
      this.sdk = sdk;
      // Read cloud/guest data BEFORE the game is allowed to write it.
      this.initialData = this.read();
      const settings = value => { this.muteAudio = !!value?.muteAudio; this.onSettings(this.muteAudio); };
      settings(sdk.game?.settings); sdk.game?.addSettingsChangeListener?.(settings);
      if (this.loading) sdk.game?.loadingStart?.();
      if (this.wantsPlay) this.start();
      if (this.launchStage === 'full' && sdk.ad?.requestAd) {
        try { this.ads = !(await deadline(sdk.ad.hasAdblock(), C.sdkTimeoutMs)); } catch { this.ads = false; }
      }
    } catch { this.sdk = null; this.ads = false; }
  }
  start() { this.wantsPlay = true; if (!this.sdk || this.active) return; try { this.sdk.game.gameplayStart(); this.active = true; } catch {} }
  stop() { this.wantsPlay = false; if (!this.sdk || !this.active) return; try { this.sdk.game.gameplayStop(); this.active = false; } catch {} }
  setLoading(value) { if (this.loading === value) return; this.loading = value; try { this.sdk?.game?.[value ? 'loadingStart' : 'loadingStop']?.(); } catch {} }
  context(value) { try { this.sdk?.game?.setGameContext?.(value); } catch {} }
  milestone(level) { try { this.sdk?.game?.reportGameCompletedPercentage?.(Math.min(100, Math.round(level / C.completionMilestone * 100))); } catch {} }
  happy() { try { this.sdk?.game?.happytime?.(); } catch {} }
  read() {
    try {
      if (this.sdk?.data) { const value = this.sdk.data.getItem(C.saveKey); this.cloudRead = true; return value; }
      return localStorage.getItem(C.saveKey);
    } catch { return null; }
  }
  acceptData() { this.dataAccepted = true; }
  write(value) {
    try {
      if (this.sdk?.data) { if (!this.cloudRead) return false; if (!this.dataAccepted) return true; this.sdk.data.setItem(C.saveKey, value); }
      else localStorage.setItem(C.saveKey, value);
      return true;
    } catch { return false; }
  }
  eligible() { return this.launchStage === 'full' && this.ads && !this.busy && performance.now() - this.boot >= C.firstAdSeconds * 1000 && performance.now() - this.lastAd >= C.adIntervalSeconds * 1000; }
  async ad(type, completedLevels = 0) {
    if (!['midgame','rewarded'].includes(type) || !this.eligible() || (type === 'midgame' && completedLevels - this.lastMidLevel < C.adEveryLevels)) return false;
    this.busy = true; this.lastAd = performance.now(); if (type === 'midgame') this.lastMidLevel = completedLevels;
    this.stop(); this.onAdState({ busy: true, playing: false });
    return new Promise(resolve => {
      let done = false, timer;
      const finish = success => {
        if (done) return; done = true; clearTimeout(timer); this.busy = false;
        this.onAdState({ busy: false, playing: false }); resolve(success);
      };
      // Block input from request; mute only when an ad actually starts.
      timer = setTimeout(() => finish(false), C.adRequestTimeoutMs);
      try {
        this.sdk.ad.requestAd(type, {
          adStarted: () => { if (done) return; clearTimeout(timer); timer = setTimeout(() => finish(false), C.adTimeoutMs); this.onAdState({ busy: true, playing: true }); },
          adFinished: () => finish(true),
          adError: error => { if (done) return; if (['adblock','adsDisabledBasicLaunch'].includes(error?.code)) this.ads = false; finish(false); }
        });
      } catch { finish(false); }
    });
  }
}
