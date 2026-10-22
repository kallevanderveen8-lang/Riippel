// Simulation and game tuning live here. Changing physics invalidates old puzzles.
export const C = Object.freeze({
  version: 1, size: 128, c2: 0.22, damp: 0.996, radius: 4, amplitude: 1,
  threshold: 0.065, steps: 360, tickHz: 60, stepsPerTick: 2,
  delaySteps: 120, maxDelay: 2, maxFrameDelta: 0.1,
  marginAll: 1.15, marginSingle: 0.7, wallMargin: 10, stoneMargin: 10,
  lanternSpacing: 10, stoneSpacing: 13, placementMargin: 7,
  lanternClearance: 24, generationRetries: 32, dailyUnlock: 3, delayUnlock: 15,
  themeStars: 10, hintFailures: 2, rewardedFailures: 3,
  firstAdSeconds: 180, adIntervalSeconds: 180, adEveryLevels: 5,
  adTimeoutMs: 90000, sdkTimeoutMs: 2500, saveKey: 'ripple-pond-v1',
  winSeconds: 1.25, touchRadius: 5, dragThreshold: 2,
  goalReward: 2, goalSolves: 5, solverBudget: 24, benchmarkCount: 300,
  themes: [
    { name: 'Morning lake', base: [57, 79, 94], light: [34, 38, 40], accent: '#e8e2d4', stone: '#8d9084', notes: [130.81, 196, 261.63], unlock: 0 },
    { name: 'Evening light', base: [65, 74, 80], light: [51, 42, 30], accent: '#e5d4b8', stone: '#948b79', notes: [146.83, 220, 293.66], unlock: 10 },
    { name: 'After the rain', base: [47, 67, 77], light: [39, 46, 48], accent: '#d8e1df', stone: '#7d8783', notes: [110, 164.81, 220], unlock: 20 },
    { name: 'Moonlit water', base: [25, 40, 58], light: [31, 40, 51], accent: '#d8dce3', stone: '#89939e', notes: [174.61, 261.63, 349.23], unlock: 30 }
  ],
  audio: { master: 0.24, ambient: 0.025, chime: 0.18, splash: 0.10 },
  render: { dpr: 2, waterResolution: 560, normalGain: 420, stoneVariants: 9, stoneTexture: 96, gravelCount: 1600, placedStoneRadius: 2.6 },
});
