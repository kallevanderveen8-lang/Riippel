import { C } from '../src/config.js';
import { generate, canPlace } from '../src/levels.js';
import { Wave, cell } from '../src/simulation.js';
import { solve } from './solver.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
const count=Number(process.argv[2]||C.benchmarkCount), budget=Number(process.argv[3]||C.solverBudget), rows=[];
const quantile=(a,q)=>{const s=[...a].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(s.length*q))]??null;};
for(let i=0;i<count;i++) {
  const number=i<10?i+1:11+(i-10)%50, seed=(Math.imul(i+1,104729)+7919)>>>0;
  const level=generate(number,seed), w=new Wave(level.rocks), peaks=w.run(level.solution);
  const certified=level.lanterns.every(l=>peaks[cell(l.x,l.y)]>=C.threshold)&&level.solution.every((s,j)=>canPlace(s,level,level.solution,j));
  const margins=number<3||level.margins.every(m=>m.all>=C.marginAll*C.threshold&&m.single<=C.marginSingle*C.threshold);
  const publicLevel={...level}; delete publicLevel.solution; delete publicLevel.margins;
  const bot=solve(publicLevel,seed^0xabcdef,budget);
  rows.push({number,seed,par:level.par,lanterns:level.lanterns.length,generationMs:level.generationMs,certified,margins,botSolved:bot.solved,botAttempts:bot.attempts,trivial:bot.solved&&bot.attempts===1});
  if((i+1)%10===0)console.log(`${i+1}/${count}: verified ${rows.filter(r=>r.certified).length}, bot solved ${rows.filter(r=>r.botSolved).length}`);
}
const solved=rows.filter(r=>r.botSolved), summary={count,budget,hardware:os.cpus()[0]?.model,node:process.version,certificateFailures:rows.filter(r=>!r.certified||!r.margins).length,botSolved:solved.length,botUnsolved:count-solved.length,trivial:rows.filter(r=>r.trivial).length,medianAttemptsSolved:quantile(solved.map(r=>r.botAttempts),.5),p90AttemptsSolved:quantile(solved.map(r=>r.botAttempts),.9),medianAttemptsCapped:quantile(rows.map(r=>r.botAttempts),.5),p90AttemptsCapped:quantile(rows.map(r=>r.botAttempts),.9),generationMedianMs:quantile(rows.map(r=>r.generationMs),.5),generationP90Ms:quantile(rows.map(r=>r.generationMs),.9),generationMaxMs:Math.max(...rows.map(r=>r.generationMs)),generationOver200:rows.filter(r=>r.generationMs>=200).length};
mkdirSync('reports',{recursive:true});writeFileSync('reports/benchmark.json',JSON.stringify({summary,rows},null,2)+'\n');console.log(JSON.stringify(summary,null,2));
