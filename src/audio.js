import { C } from './config.js';
export class Sound {
  constructor() { this.muted = false; this.paused = false; this.theme = C.themes[0]; this.nodes = []; }
  async unlock() {
    if (!this.ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
      this.ctx = new Audio(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); this.master.gain.value = C.audio.master;
      this.pad = this.ctx.createGain(); this.pad.gain.value = C.audio.ambient; this.pad.connect(this.master); this.makeWater(); this.setTheme(this.theme);
    }
    if (['suspended', 'interrupted'].includes(this.ctx.state)) await this.ctx.resume().catch(() => {}); this.sync();
  }
  setTheme(theme) {
    this.theme = theme; if (!this.ctx) return;
    this.nodes.forEach(n => n.stop()); this.nodes = [];
    this.pad.gain.value = C.audio.ambient * .32;
    theme.notes.forEach((f, i) => { const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f / 2; o.detune.value = i * 3; o.connect(this.pad); o.start(); this.nodes.push(o); });
  }
  makeWater() {
    const length = this.ctx.sampleRate * C.audio.waterLoopSeconds, buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < length; i++) { smooth = (smooth + (Math.random() * 2 - 1) * .022) / 1.022; data[i] = smooth * 3; }
    this.waterBuffer = buffer;
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    source.buffer = buffer; source.loop = true; filter.type = 'lowpass'; filter.frequency.value = C.audio.waterLowpass; gain.gain.value = C.audio.waterBed;
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(); this.water = source;
  }
  sync() { if (this.ctx) this.master.gain.setTargetAtTime(this.muted || this.portalMuted || this.paused ? 0 : C.audio.master, this.ctx.currentTime, .03); }
  tone(freq, duration, gain, type = 'sine') {
    if (!this.ctx || this.muted || this.portalMuted || this.paused) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + duration);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + duration + .05); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  chime(i) { const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; this.tone(notes[i % notes.length], 1.5, C.audio.chime); this.tone(notes[i % notes.length] * 2, .75, C.audio.chime * .15); }
  splash() {
    if (!this.ctx || this.muted || this.portalMuted || this.paused) return;
    const t = this.ctx.currentTime, noise = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain(), drop = this.ctx.createOscillator(), body = this.ctx.createGain();
    noise.buffer = this.waterBuffer; filter.type = 'bandpass'; filter.frequency.setValueAtTime(1800, t); filter.frequency.exponentialRampToValueAtTime(320, t + .35); filter.Q.value = .8;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(C.audio.splash * 3, t + .018); gain.gain.exponentialRampToValueAtTime(.0001, t + .55);
    noise.connect(filter); filter.connect(gain); gain.connect(this.master); noise.start(t); noise.stop(t + .6); noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    drop.frequency.setValueAtTime(260, t); drop.frequency.exponentialRampToValueAtTime(68, t + .16); body.gain.setValueAtTime(C.audio.splash, t); body.gain.exponentialRampToValueAtTime(.0001, t + .24); drop.connect(body); body.connect(this.master); drop.start(t); drop.stop(t + .25); drop.onended = () => { drop.disconnect(); body.disconnect(); };
  }
  place() { this.tone(680, .055, .025); this.tone(970, .025, .012); }
}
