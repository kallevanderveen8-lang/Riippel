// Simulation and game tuning live here. Changing physics invalidates old puzzles.
export const C = Object.freeze({
  version: 1, launchStage: 'basic',
  chapters: ['First light', 'Stone & echo', 'A moment in time', 'Across the water', 'Quiet currents', 'Far shores'], size: 128, c2: 0.22, damp: 0.996, radius: 4, amplitude: 1,
  threshold: 0.065, steps: 360, tickHz: 60, stepsPerTick: 2, retryStepsPerTick: 4,
  delaySteps: 120, maxDelay: 2, maxFrameDelta: 0.1,
  marginAll: 1.15, marginSingle: 0.7, wallMargin: 10, stoneMargin: 10,
  lanternSpacing: 10, stoneSpacing: 13, placementMargin: 7,
  lanternClearance: 24, generationRetries: 32, dailyUnlock: 3, delayUnlock: 15,
  themeStars: 10, hintFailures: 2, rewardedFailures: 3, masteryTokens: 2, guidedHelpFailures: 6,
  firstAdSeconds: 180, adIntervalSeconds: 180, adEveryLevels: 5,
  adTimeoutMs: 90000, sdkTimeoutMs: 2500, saveKey: 'ripple-pond-v1',
  winSeconds: 1.0, burstSeconds: 1.05, bubbleSeconds: 0.48, visualTailSteps: 720, chapterLength: 5, lakeLength: 10, featuredLevels: 120, lakeCompletionCoins: 4, completionMilestone: 30, chapterBonus: 3, initialTokens: 3, chapterTokens: 2, dailyLength: 3, dailyLevels: [8, 12, 16], dailyTokens: 2, dailyGiftCoins: [2,3,3,4,4,5,7], recordLimit: 300, maxTokens: 999, freeHelpFailures: 4, adRequestTimeoutMs: 15000, sdkInitTimeoutMs: 4500, touchPixels: 48, mouseHitPixels: 14, touchRadius: 5, dragThreshold: 2,
  goalReward: 2, goalSolves: 5, lakeSkipCost: 3, solverBudget: 24, benchmarkCount: 300,
  cosmetics: {
    stones: [
      { id:'river', name:'River stone', cost:0, kind:'Natural' },
      { id:'slate', name:'Slate stone', cost:5, kind:'Natural' },
      { id:'amber', name:'Amber stone', cost:8, kind:'Natural' },
      { id:'sleepy', name:'Sleepy pebble', cost:12, kind:'Playful' },
      { id:'frog', name:'Frog stone', cost:15, kind:'Playful' },
      { id:'potato', name:'Tiny potato', cost:18, kind:'Playful' },
      { id:'moss', name:'Moss stone', cost:10, kind:'Natural', unlockLevel:11 },
      { id:'quartz', name:'Blue quartz', cost:14, kind:'Natural', unlockLevel:21 },
      { id:'opal', name:'Opal stone', cost:20, kind:'Natural', unlockLevel:31 },
      { id:'duck', name:'Duck pebble', cost:25, kind:'Playful', unlockLevel:41 },
      { id:'bread', name:'Little loaf', cost:35, kind:'Playful', unlockLevel:61 },
      { id:'cosmic', name:'Cosmic stone', cost:45, kind:'Playful', unlockLevel:91 },
      { id:'missing', name:'404 pebble', cost:65, kind:'Internet oddity', unlockLevel:51 },
      { id:'loading', name:'Loading pebble', cost:95, kind:'Internet oddity', unlockLevel:71 },
      { id:'royal-duck', name:'Royal duck', cost:180, kind:'Collector', unlockLevel:101 },
      { id:'void', name:'Tiny black hole', cost:300, kind:'Collector', unlockLevel:121 }
    ],
    lanterns: [
      { id:'bronze', name:'Bronze lantern', cost:0, kind:'Classic' },
      { id:'reed', name:'Reed lantern', cost:6, kind:'Natural' },
      { id:'silver', name:'Silver lantern', cost:9, kind:'Cool' },
      { id:'firefly', name:'Firefly lantern', cost:14, kind:'Warm' },
      { id:'copper', name:'Copper lantern', cost:12, kind:'Warm', unlockLevel:21 },
      { id:'lotus', name:'Lotus lantern', cost:18, kind:'Natural', unlockLevel:31 },
      { id:'star', name:'Starlight lantern', cost:25, kind:'Cool', unlockLevel:51 },
      { id:'moon', name:'Moonstone lantern', cost:32, kind:'Cool', unlockLevel:81 },
      { id:'signal', name:'Signal lantern', cost:75, kind:'Internet oddity', unlockLevel:61 },
      { id:'sunflower', name:'Sunflower lantern', cost:125, kind:'Natural', unlockLevel:81 },
      { id:'aurora', name:'Aurora lantern', cost:220, kind:'Collector', unlockLevel:111 }
    ]
  },
  themes: [
    { name: 'Morning lake', art: 'assets/morning-lake.webp', landscape: 'Woodland lake', description: 'Jade water, mossy stones and fern-lined banks.', base: [7, 42, 54], light: [50, 94, 93], accent: '#b7cbb5', stone: '#96998a', notes: [130.81, 196, 261.63], unlock: 0,
      scene: { seed: 72419, banks: [.76, .2], bed: '#817f62', plants: 'fern', foliage: ['#354e36','#55704b','#819065'], clarity: .76, canopy: .85, shore: 1 } },
    { name: 'Evening light', art: 'assets/evening-light.webp', landscape: 'Reed shallows', description: 'Warm reflections and sheltered, reed-covered shores.', base: [56, 76, 57], light: [98, 87, 55], accent: '#d2c49c', stone: '#968d72', notes: [146.83, 220, 293.66], unlock: 10,
      scene: { seed: 23681, banks: [.85, .42], bed: '#9c8e67', plants: 'reed', foliage: ['#646b3e','#8e905c','#b7a873'], clarity: .5, canopy: .35, shore: .8 } },
    { name: 'After the rain', art: 'assets/after-rain.webp', landscape: 'Rainforest pool', description: 'Deep green water, wet slate and overhanging ferns.', base: [27, 56, 53], light: [69, 84, 76], accent: '#b6cbc0', stone: '#697b73', notes: [110, 164.81, 220], unlock: 20,
      scene: { seed: 51937, banks: [.62, .18], bed: '#6d7861', plants: 'fern', foliage: ['#294b36','#40684a','#6b8a60'], clarity: .58, canopy: 1.3, shore: 1.2 } },
    { name: 'Moonlit water', art: 'assets/moonlit-water.webp', landscape: 'Moonlit cove', description: 'Still blue water and silver light on a quiet rocky bank.', base: [22, 38, 48], light: [49, 64, 75], accent: '#b7cbd2', stone: '#737f89', notes: [174.61, 261.63, 349.23], unlock: 30,
      scene: { seed: 83917, banks: [.55, .12], bed: '#65716f', plants: 'grass', foliage: ['#344b4e','#536869','#788482'], clarity: .3, canopy: .55, shore: .9 } },
    { name: 'Autumn glow', art: 'assets/autumn-glow.webp', landscape: 'Amber woodland', description: 'Olive water with copper leaves and weathered sandstone.', base: [57, 70, 44], light: [93, 81, 45], accent: '#d6bd8a', stone: '#988873', notes: [164.81, 246.94, 329.63], unlock: 60,
      scene: { seed: 39671, banks: [.24, .8], bed: '#9c865b', plants: 'autumn', foliage: ['#754b30','#a3743e','#c59a52'], clarity: .65, canopy: 1, shore: 1.05 } },
    { name: 'Alpine dawn', art: 'assets/alpine-dawn.webp', landscape: 'Alpine basin', description: 'Clear turquoise water, pale granite and sparse mountain grass.', base: [30, 81, 88], light: [75, 101, 101], accent: '#b9d7d0', stone: '#a3aaa3', notes: [196, 293.66, 392], unlock: 120,
      scene: { seed: 61843, banks: [.32, .74], bed: '#a1aa95', plants: 'alpine', foliage: ['#4b6251','#71816a','#a2a48a'], clarity: .95, canopy: .16, shore: 1.25 } }
  ],
  audio: { master: 0.24, padBed: 0.005, musicBus: 0.6, musicNote: 0.024, chime: 0.11, resolve: 0.055, reward: 0.07, splash: 0.07, place: 0.018, waterLoopSeconds: 4, waterLowpass: 650, waterBed: 0.055 },
  render: { dpr: 2, waterResolution: 560, normalGain: 280, stoneVariants: 9, stoneTexture: 128, gravelCount: 1600, placedStoneRadius: 2.6, stoneMinPixels: 20, lanternMinPixels: 24 },
});
export function lakeForLevel(number) {
  const group = Math.floor((Math.max(1,number)-1)/C.lakeLength);
  const themeIndex = group % C.themes.length;
  const visit = Math.floor(group/C.themes.length)+1;
  return { group, first:group*C.lakeLength+1, last:(group+1)*C.lakeLength, themeIndex, visit, theme:C.themes[themeIndex], name:C.themes[themeIndex].name+(visit>1?` · Return ${visit}`:'') };
}
