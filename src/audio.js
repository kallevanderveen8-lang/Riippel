import { C } from './config.js';

export class Sound {
  constructor() {
    this.muted = false; this.paused = false; this.inMenu = false;
    this.ambientEnabled = true; this.musicEnabled = true;
    this.theme = C.themes[0]; this.nodes = []; this.phraseIndex = 0;
  }
  async unlock() {
    if (!this.ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
      this.ctx = new Audio(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.effects = this.ctx.createGain(); this.effects.gain.value = 1; this.effects.connect(this.master);
      this.ui = this.ctx.createGain(); this.ui.gain.value = 1; this.ui.connect(this.master);
      this.pad = this.ctx.createGain(); this.pad.gain.value = 0; this.pad.connect(this.master);
      this.music = this.ctx.createGain(); this.music.gain.value = 0; this.music.connect(this.master);
      this.makeWater(); this.setTheme(this.theme);
    }
    if (['suspended', 'interrupted'].includes(this.ctx.state)) await this.ctx.resume().catch(() => {});
    this.sync();
  }
  setTheme(theme) {
    if (this.theme === theme && this.themeGroup) return;
    this.theme = theme; if (!this.ctx) return;
    const now = this.ctx.currentTime, old = this.themeGroup;
    if (old) {
      old.gain.gain.setTargetAtTime(0, now, .08);
      let remaining = old.nodes.length;
      for (const node of old.nodes) {
        node.stop(now + .5);
        node.onended = () => { node.disconnect(); if (!--remaining) old.gain.disconnect(); };
      }
    }
    const gain = this.ctx.createGain(); gain.gain.value = 0; gain.connect(this.pad);
    gain.gain.setTargetAtTime(1, now, .16);
    const nodes = theme.notes.map((frequency, index) => {
      const node = this.ctx.createOscillator(); node.type = 'sine';
      node.frequency.value = frequency / 2; node.detune.value = index * 3;
      node.connect(gain); node.start(); return node;
    });
    this.themeGroup = {gain,nodes}; this.nodes = nodes;
    this.phraseIndex = 0; this.nextPhraseAt = now + 5;
    this.sync();
  }
  makeWater() {
    const length = this.ctx.sampleRate * C.audio.waterLoopSeconds;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < length; i++) { smooth = (smooth + (Math.random() * 2 - 1) * .022) / 1.022; data[i] = smooth * 3; }
    this.waterBuffer = buffer;
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    source.buffer = buffer; source.loop = true; filter.type = 'lowpass'; filter.frequency.value = C.audio.waterLowpass; gain.gain.value = 0;
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start();
    this.water = source; this.waterGain = gain;
  }
  sync() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, silent = this.muted || this.portalMuted || this.paused;
    const background = !silent && !this.inMenu;
    this.master.gain.setTargetAtTime(silent ? 0 : C.audio.master, now, .035);
    this.effects.gain.setTargetAtTime(this.inMenu ? 0 : 1, now, .035);
    this.pad.gain.setTargetAtTime(background && this.musicEnabled ? C.audio.padBed : 0, now, .12);
    this.music.gain.setTargetAtTime(background && this.musicEnabled ? C.audio.musicBus : 0, now, .12);
    this.waterGain.gain.setTargetAtTime(background && this.ambientEnabled ? C.audio.waterBed : 0, now, .12);
  }
  tone(freq, duration, gain, type = 'sine', when = this.ctx?.currentTime, output = this.effects) {
    if (!this.ctx || this.muted || this.portalMuted || this.paused) return;
    const t = when, attack = output === this.music ? .045 : .012;
    const node = this.ctx.createOscillator(), envelope = this.ctx.createGain();
    node.type = type; node.frequency.setValueAtTime(freq, t);
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(gain, t + attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
    node.connect(envelope); envelope.connect(output); node.start(t); node.stop(t + duration + .05);
    node.onended = () => { node.disconnect(); envelope.disconnect(); };
  }
  update(phase) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.ctx.state !== 'running' || !this.musicEnabled || this.muted || this.portalMuted || this.paused || this.inMenu || phase !== 'ready') {
      this.nextPhraseAt = Math.max(this.nextPhraseAt || 0, now + 2.5); return;
    }
    if (now < this.nextPhraseAt) return;
    const phrase = [[0,1,2],[1,2,1],[2,1,0]][this.phraseIndex % 3];
    phrase.forEach((index,i) => this.tone(this.theme.notes[index] * 2, .75, C.audio.musicNote * (i ? .78 : 1), 'sine', now + .05 + [0,.72,1.55][i], this.music));
    this.nextPhraseAt = now + 12 + (this.phraseIndex % 3) * 2;
    this.phraseIndex++;
  }
  chime(index, finish = 'bronze') {
    const soft = ['reed','lotus','sunflower'].includes(finish);
    const note = this.theme.notes[index % this.theme.notes.length] * 2;
    this.tone(note, .72, C.audio.chime / (1 + index * .13), soft ? 'sine' : 'triangle');
    this.tone(note * 2, .3, C.audio.chime * .08, 'sine');
  }
  resolve() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + .12;
    this.tone(this.theme.notes[0] * 2, .46, C.audio.resolve, 'sine', now);
    this.tone(this.theme.notes[1] * 2, .62, C.audio.resolve * .72, 'sine', now + .14);
  }
  reward() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.tone(this.theme.notes[1] * 2, .32, C.audio.reward, 'sine', now, this.ui);
    this.tone(this.theme.notes[2] * 2, .48, C.audio.reward * .7, 'sine', now + .13, this.ui);
  }
  fail() { this.tone(this.theme.notes[0] * 2, .18, .025, 'sine'); }
  splash(style = 'river') {
    if (!this.ctx || this.muted || this.portalMuted || this.paused) return;
    const t = this.ctx.currentTime, noise = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain(), drop = this.ctx.createOscillator(), body = this.ctx.createGain();
    noise.buffer = this.waterBuffer; filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1350, t); filter.frequency.exponentialRampToValueAtTime(290, t + .25); filter.Q.value = .75;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(C.audio.splash * 2.2, t + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, t + .38);
    noise.connect(filter); filter.connect(gain); gain.connect(this.effects); noise.start(t); noise.stop(t + .4);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    drop.type = 'sine'; drop.frequency.setValueAtTime(style.includes('duck') ? 330 : 225, t);
    drop.frequency.exponentialRampToValueAtTime(style.includes('duck') ? 190 : 85, t + .13);
    body.gain.setValueAtTime(C.audio.splash * (style === 'void' ? .6 : 1), t);
    body.gain.exponentialRampToValueAtTime(.0001, t + .2);
    drop.connect(body); body.connect(this.effects); drop.start(t); drop.stop(t + .21);
    drop.onended = () => { drop.disconnect(); body.disconnect(); };
  }
  place() { this.tone(390, .07, C.audio.place, 'triangle'); }
}
