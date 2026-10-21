import { Wave, cell } from '../src/simulation.js';
import { C } from '../src/config.js';
const wave = new Wave();
const peak = wave.run([{ x: 64, y: 64 }]).slice();
console.log('128×128, 360 steps, T =', C.threshold);
console.table([5, 10, 15, 20, 25, 30, 35, 40, 50].map(d => ({ distance: d, singlePeak: +peak[cell(64 + d, 64)].toFixed(5), lights: peak[cell(64 + d, 64)] >= C.threshold })));
const p = wave.run([{ x: 40, y: 64 }, { x: 88, y: 64 }]);
console.table([0, 10, 20, 30, 40].map(d => ({ yOffset: d, twoPeak: +p[cell(64, 64 + d)].toFixed(5), lights: p[cell(64, 64 + d)] >= C.threshold })));
console.log('Finite:', p.every(Number.isFinite), 'max:', Math.max(...p));
