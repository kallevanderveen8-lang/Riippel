import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/audio.js';
import { C } from '../src/config.js';

test('water, music and effects remain independently controllable', async () => {
  class Parameter {
    value = 0;
    setTargetAtTime(value) { this.value = value; }
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
  }
  class Node {
    gain = new Parameter(); frequency = new Parameter(); detune = new Parameter(); Q = { value: 0 };
    connect() {} start() {} stop(time) { this.stopTime = time; } disconnect() {}
  }
  class AudioContext {
    sampleRate = 8000; currentTime = 0; state = 'running'; destination = new Node(); oscillators = 0; oscillatorsCreated = [];
    createGain() { return new Node(); }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createOscillator() { this.oscillators++; const node = new Node(); this.oscillatorsCreated.push(node); return node; }
  }
  globalThis.window = { AudioContext };
  try {
    const sound = new Sound(); await sound.unlock();
    assert.equal(sound.waterGain.gain.value, C.audio.waterBed);
    sound.ambientEnabled = false; sound.sync();
    assert.equal(sound.waterGain.gain.value, 0);
    assert.equal(sound.pad.gain.value, C.audio.padBed);
    sound.ctx.currentTime = 5.1;const phraseBefore=sound.ctx.oscillators;sound.update('ready');
    assert.equal(sound.ctx.oscillators,phraseBefore+3);
    sound.musicEnabled = false; sound.sync();
    assert.equal(sound.pad.gain.value, 0);
    assert.equal(sound.music.gain.value, 0);
    assert.equal(sound.master.gain.value, C.audio.master);
    const before = sound.ctx.oscillators; sound.place();
    assert.equal(sound.ctx.oscillators, before + 1);
    sound.inMenu=true;sound.sync();sound.reward();
    assert.equal(sound.ctx.oscillators,before+3);
    assert.equal(sound.effects.gain.value, 0);
    assert.equal(sound.pad.gain.value, 0);
    assert.equal(sound.waterGain.gain.value, 0);
    assert.equal(sound.ui.gain.value, 1);
    const menuNotes = sound.ctx.oscillators;
    sound.update('ready');
    assert.equal(sound.ctx.oscillators, menuNotes);
    sound.inMenu=false;sound.paused=true;sound.sync();sound.reward();
    assert.equal(sound.master.gain.value, 0);
    assert.equal(sound.ctx.oscillators, menuNotes);
    sound.paused=false;sound.musicEnabled=true;sound.sync();
    sound.setTheme(C.themes[1]);
    assert.equal(sound.theme, C.themes[1]);
    assert.equal(sound.nextPhraseAt, sound.ctx.currentTime+5);
    sound.resolve();
    assert.ok(sound.ctx.oscillatorsCreated.slice(-2).every(node => node.stopTime <= sound.ctx.currentTime + C.winSeconds));
    sound.muted = true; sound.sync();
    assert.equal(sound.master.gain.value, 0);
  } finally { delete globalThis.window; }
});
