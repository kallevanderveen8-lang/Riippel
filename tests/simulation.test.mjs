import test from 'node:test';import assert from 'node:assert/strict';
import { Wave,cell,daySeed,mulberry32 } from '../src/simulation.js';import { C } from '../src/config.js';import { generate,canPlace,levelName,difficulty } from '../src/levels.js';import { SCRIPTED } from '../src/scripted.js';
import { CURATED } from '../src/curated.js';
test('fixed grid, exact repeatability, finite long-run energy',()=>{const w=new Wave();const s=[{x:36,y:64,delay:0},{x:92,y:64,delay:0}];const first=w.run(s).slice();assert.deepEqual(w.run(s),first);for(let i=0;i<1200;i++)w.step();assert.ok(w.h.every(Number.isFinite));assert.ok(Math.max(...w.h)<1);assert.equal(w.h.length,128*128);});
test('one stone near / far calibration and constructive overlap',()=>{const w=new Wave(),p=w.run([{x:64,y:64}]).slice();assert.ok(p[cell(84,64)]>=C.threshold);assert.ok(p[cell(94,64)]<C.threshold);const a=w.run([{x:36,y:64}]).slice(),b=w.run([{x:92,y:64}]).slice(),both=w.run([{x:36,y:64},{x:92,y:64}]);assert.ok(a[cell(64,64)]<=C.marginSingle*C.threshold);assert.ok(b[cell(64,64)]<=C.marginSingle*C.threshold);assert.ok(both[cell(64,64)]>=C.marginAll*C.threshold);});
test('rock walls stay zero and reflective boundary uses own cell',()=>{const w=new Wave([{x:64,y:64,rx:5,ry:10}]);w.run([{x:48,y:64}]);assert.equal(w.h[cell(64,64)],0);assert.equal(w.left[0],0);assert.equal(w.up[0],0);assert.equal(w.right[cell(58,64)],cell(58,64));});
test('delayed impulses enter only on their integer simulation step',()=>{const w=new Wave();w.reset([{x:64,y:64,delay:1}]);for(let i=0;i<C.delaySteps;i++)w.step();assert.ok(w.h.every(x=>x===0));w.step();assert.ok(w.peak[cell(64,64)]>=1);});
test('all 10 authored onboarding solutions are valid and robust',()=>{for(const l of SCRIPTED){const w=new Wave(l.rocks),p=w.run(l.solution);for(const lamp of l.lanterns)assert.ok(p[cell(lamp.x,lamp.y)]>=C.threshold,`pond ${l.number}`);for(let i=0;i<l.solution.length;i++)assert.ok(canPlace(l.solution[i],l,l.solution,i));if(l.number>=3){assert.equal(l.margins.length,l.lanterns.length);for(const m of l.margins){assert.ok(m.all>=1.15*C.threshold);assert.ok(m.single<=.7*C.threshold);}}}});
test('fixed second and third lake puzzles retain certified solutions',()=>{assert.equal(CURATED.length,20);for(const l of CURATED){const peak=new Wave(l.rocks).run(l.solution);assert.equal(l.seed,l.number*7919);assert.equal(l.par,difficulty(l.number).par);for(const lamp of l.lanterns)assert.ok(peak[cell(lamp.x,lamp.y)]>=C.threshold,`level ${l.number}`);for(let i=0;i<l.solution.length;i++)assert.ok(canPlace(l.solution[i],l,l.solution,i));}});
test('generated level and UTC date seed are deterministic',()=>{const a=generate(21,12345),b=generate(21,12345);delete a.generationMs;delete b.generationMs;assert.deepEqual(a,b);assert.equal(daySeed(new Date('2026-10-21T01:00:00+02:00')),daySeed(new Date('2026-10-20T23:00:00Z')));const r=mulberry32(3),s=mulberry32(3);assert.deepEqual(Array.from({length:50},r),Array.from({length:50},s));});
test('later shores vary their opening and finale while old puzzles remain reproducible',()=>{
 assert.deepEqual([11,12,13,16,20,21,30,31,40].map(n=>difficulty(n).par),[3,3,4,4,5,3,5,3,5]);
 assert.equal(difficulty(11).rocks,0);assert.equal(difficulty(12).rocks,1);assert.equal(difficulty(13).rocks,1);assert.equal(difficulty(14).rocks,2);assert.equal(difficulty(20).delays,true);
 assert.equal(difficulty(11,true).par,4);
 const old=generate(11,11*7919,false,true), current=generate(11);
 assert.equal(old.par,4);assert.equal(current.par,3);assert.equal(old.solution.length,4);
});
test('featured lake boundaries provide solvable generated levels',()=>{
 const boundaries=[11,20,21,30,31,40,41,50,51,60,61,70,71,80,81,90,91,100,101,110,111,120];
 for(const number of boundaries){
  const level=generate(number),peak=new Wave(level.rocks).run(level.solution);
  assert.equal(level.name,levelName(number));assert.ok(level.lanterns.length>0);
  for(const lantern of level.lanterns)assert.ok(peak[cell(lantern.x,lantern.y)]>=C.threshold,`level ${number}`);
  for(let i=0;i<level.solution.length;i++)assert.ok(canPlace(level.solution[i],level,level.solution,i),`placement ${number}`);
 }
});
test('sparse peak tracking is bit-identical to full-grid peaks at every candidate',()=>{const w=new Wave([{x:64,y:40,rx:5,ry:10}]),stones=[{x:40,y:64,delay:0},{x:90,y:80,delay:1}],indices=[cell(64,64),cell(32,32),cell(80,96)];const full=w.run(stones).slice(),sparse=w.run(stones,C.steps,indices);for(const i of indices)assert.equal(sparse[i],full[i]);});
