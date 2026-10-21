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
    { name: 'Moonwater', base: [7, 29, 37], light: [65, 183, 171], accent: '#a8e6d6', stone: '#e0eee5', notes: [130.81, 196, 261.63], unlock: 0 },
    { name: 'Violet dusk', base: [23, 19, 43], light: [155, 110, 199], accent: '#cfb6f6', stone: '#e9dff9', notes: [146.83, 220, 293.66], unlock: 10 },
    { name: 'Amber tide', base: [32, 25, 23], light: [194, 139, 64], accent: '#efd39c', stone: '#ffecd0', notes: [110, 164.81, 220], unlock: 20 },
    { name: 'Blue hour', base: [10, 24, 48], light: [70, 143, 215], accent: '#a7d4ff', stone: '#d4eaff', notes: [174.61, 261.63, 349.23], unlock: 30 }
  ],
  audio: { master: 0.24, ambient: 0.025, chime: 0.18, splash: 0.10 },
  render: { dpr: 2, fieldGain: 180, normalGain: 360, particles: 24 },
});
