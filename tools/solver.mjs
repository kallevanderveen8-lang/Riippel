import { C } from '../src/config.js';
import { Wave, mulberry32, cell } from '../src/simulation.js';
import { canPlace } from '../src/levels.js';
// Black-box search: accepts only public level geometry, never level.solution.
export function solve(level, seed = 123, budget = C.solverBudget) {
  const rng = mulberry32(seed), wave = new Wave(level.rocks), k = level.par;
  const center = level.lanterns.reduce((p,l) => ({x:p.x+l.x/level.lanterns.length,y:p.y+l.y/level.lanterns.length}),{x:0,y:0});
  function randomPoint(stones, ignore=-1) {
    for(let i=0;i<500;i++) {
      const p={x:7+Math.floor(rng()*114),y:7+Math.floor(rng()*114),delay:0};
      if(canPlace(p,level,stones,ignore)) return p;
    }
    return null;
  }
  function start() {
    const a=[];
    for(let i=0;i<k;i++) {
      let p;
      // Human-like first hypothesis: opposed stones near the group of lights.
      if(k>=2 && i<2) {
        const offset=26+Math.floor(rng()*8), horizontal=rng()<.5;
        p={x:Math.round(center.x)+(horizontal?(i===0?-offset:offset):0),y:Math.round(center.y)+(horizontal?0:(i===0?-offset:offset)),delay:0};
      }
      if(!p||!canPlace(p,level,a))p=randomPoint(a);
      if(!p)return null; a.push(p);
    }
    return a;
  }
  let current=start(); if(!current)return {solved:false,attempts:0,score:0};
  let best=-Infinity, bestStones=current;
  for(let attempt=1;attempt<=budget;attempt++) {
    const peaks=wave.run(current);
    const values=level.lanterns.map(l=>peaks[cell(l.x,l.y)]/C.threshold);
    const score=values.reduce((v,x)=>v+Math.min(1,x),0)+Math.min(...values)*.1;
    if(values.every(x=>x>=1))return {solved:true,attempts:attempt,score,stones:current};
    if(score>best){best=score;bestStones=current.map(s=>({...s}));}
    current=bestStones.map(s=>({...s}));
    if(attempt%8===0) {current=start()||current;continue;}
    const index=Math.floor(rng()*k), radius=attempt%3===0?18:6;
    const p={...current[index],x:current[index].x+Math.round((rng()*2-1)*radius),y:current[index].y+Math.round((rng()*2-1)*radius)};
    if(level.number>=C.delayUnlock&&rng()<.15)p.delay=Math.floor(rng()*3);
    if(canPlace(p,level,current,index))current[index]=p;
    else current[index]=randomPoint(current,index)||current[index];
  }
  return {solved:false,attempts:budget,score:best};
}
