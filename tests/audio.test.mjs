import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/audio.js';
import { C } from '../src/config.js';

test('lake ambience can be muted while stone effects remain audible', async () => {
  class Parameter {
    value = 0;
    setTargetAtTime(value) { this.value = value; }
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
  }
  class Node {
    gain = new Parameter(); frequency = new Parameter(); detune = new Parameter(); Q = { value: 0 };
    connect() {} start() {} stop() {} disconnect() {}
  }
  class AudioContext {
    sampleRate = 8000; currentTime = 0; state = 'running'; destination = new Node(); oscillators = 0;
    createGain() { return new Node(); }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createOscillator() { this.oscillators++; return new Node(); }
  }
  globalThis.window = { AudioContext };
  try {
    const sound = new Sound(); await sound.unlock();
    assert.equal(sound.waterGain.gain.value, C.audio.waterBed);
    sound.ambientEnabled = false; sound.sync();
    assert.equal(sound.waterGain.gain.value, 0);
    assert.equal(sound.pad.gain.value, 0);
    assert.equal(sound.master.gain.value, C.audio.master);
    const before = sound.ctx.oscillators; sound.place();
    assert.equal(sound.ctx.oscillators, before + 2);
    sound.muted = true; sound.sync();
    assert.equal(sound.master.gain.value, 0);
  } finally { delete globalThis.window; }
});
