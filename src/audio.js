import { C } from './config.js';
export class Sound {
  constructor() { this.muted = false; this.paused = false; this.theme = C.themes[0]; this.nodes = []; }
  async unlock() {
    if (!this.ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
      this.ctx = new Audio(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); this.master.gain.value = C.audio.master;
      this.pad = this.ctx.createGain(); this.pad.gain.value = C.audio.ambient; this.pad.connect(this.master); this.setTheme(this.theme);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {}); this.sync();
  }
  setTheme(theme) {
    this.theme = theme; if (!this.ctx) return;
    this.nodes.forEach(n => n.stop()); this.nodes = [];
    theme.notes.forEach((f, i) => { const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f / 2; o.detune.value = i * 3; o.connect(this.pad); o.start(); this.nodes.push(o); });
  }
  sync() { if (this.ctx) this.master.gain.setTargetAtTime(this.muted || this.paused ? 0 : C.audio.master, this.ctx.currentTime, .03); }
  tone(freq, duration, gain, type = 'sine') {
    if (!this.ctx || this.muted || this.paused) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + duration);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + duration + .05); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  chime(i) { const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; this.tone(notes[i % notes.length], 1.5, C.audio.chime); this.tone(notes[i % notes.length] * 2, .75, C.audio.chime * .15); }
  splash() { this.tone(98, .5, C.audio.splash); this.tone(147, .3, C.audio.splash / 2); }
  place() { this.tone(392, .18, .04); }
}
