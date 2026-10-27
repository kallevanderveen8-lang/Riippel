// Run against a local `?test` server. Results are diagnostic, not a pass/fail
// gate: headless CPU throttling cannot stand in for real low-end hardware.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try { return require('playwright'); }
  catch { return require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`); }
})();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ['--no-sandbox'],
});
const url = process.env.PERF_URL || 'http://localhost:4260/?test';
const repeats = Math.max(1, Number(process.env.PERF_REPEATS || 2));
const levelNumber = Math.max(1, Number(process.env.PERF_LEVEL || 1));
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round((sorted[Math.floor((sorted.length - 1) * p)] || 0) * 10) / 10;
};
const results = [];

try {
  for (const cpuThrottle of [1, 4]) for (let run = 0; run < repeats; run++) {
    const context = await browser.newContext({ viewport: { width: 1216, height: 684 } });
    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
      await page.route('https://sdk.crazygames.com/**', request => request.abort());
      await page.addInitScript(() => {
        window.__perf = { costs: [] };
        const raf = window.requestAnimationFrame;
        window.requestAnimationFrame = function (callback) {
          return raf.call(window, time => {
            const start = performance.now();
            callback(time);
            if (callback.name === 'frame') window.__perf.costs.push(performance.now() - start);
          });
        };
      });
      const start = performance.now();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__ripple?.state.level?.number === 1);
      const firstLevelReadyMs = Math.round(performance.now() - start);
      await page.click('#welcome-skip');
      if (levelNumber !== 1) await page.evaluate(number => window.__ripple.go(number), levelNumber);
      await page.waitForTimeout(250);

      const sample = async () => {
        const firstCost = await page.evaluate(() => window.__perf.costs.length);
        const intervals = await page.evaluate(() => new Promise(resolve => {
          const samples = [];
          let previous;
          function step(time) {
            if (previous) samples.push(time - previous);
            previous = time;
            if (samples.length < 90) requestAnimationFrame(step);
            else resolve(samples);
          }
          requestAnimationFrame(step);
        }));
        return {
          waterResolution: await page.evaluate(() => window.__ripple.state.waterResolution),
          frameMsP50: percentile(intervals, .5),
          frameMsP95: percentile(intervals, .95),
          drawMsP50: percentile(await page.evaluate(index => window.__perf.costs.slice(index), firstCost), .5),
        };
      };
      const idle = await sample();
      await page.evaluate(() => window.__ripple.solve());
      const wave = await sample();
      results.push({ cpuThrottle, run, level: levelNumber, firstLevelReadyMs, idle, wave });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
